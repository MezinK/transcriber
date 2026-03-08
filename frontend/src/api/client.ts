import type { Transcription, TranscriptionListResponse, TranscriptionStatus } from "../types";

const BASE = "/transcriptions";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json();
}

export async function getTranscriptions(
  offset = 0,
  limit = 50,
  status?: TranscriptionStatus,
): Promise<TranscriptionListResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  const res = await fetch(`${BASE}/?${params}`);
  return handleResponse(res);
}

export async function getTranscription(id: string): Promise<Transcription> {
  const res = await fetch(`${BASE}/${id}`);
  return handleResponse(res);
}

export async function deleteTranscription(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function uploadFile(
  file: File,
  onProgress?: (p: UploadProgress) => void,
): { promise: Promise<Transcription>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<Transcription>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", `${BASE}/`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new ApiError(xhr.status, body.detail ?? xhr.statusText));
        } catch {
          reject(new ApiError(xhr.status, xhr.statusText));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(formData);
  });

  return { promise, abort: () => xhr.abort() };
}
