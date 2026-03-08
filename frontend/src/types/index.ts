export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

export type MediaType = "audio" | "video";

export interface Transcription {
  id: string;
  status: TranscriptionStatus;
  file_name: string;
  media_type: MediaType;
  result_text: string | null;
  result_json: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TranscriptionListResponse {
  items: Transcription[];
  total: number;
}
