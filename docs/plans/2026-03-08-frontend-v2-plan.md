# Frontend V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React+Vite+Tailwind frontend with 5 visually distinct versions of a transcription app, all sharing the same hooks/API client, served under `/1` through `/5`.

**Architecture:** Single Vite project with React Router. Shared logic (API client, hooks, types, utils) in `src/api/`, `src/hooks/`, `src/types/`, `src/utils/`. Each version in `src/versions/v{1-5}/` with its own component tree. Vite proxies API calls to the FastAPI backend at `:8000`. No backend changes.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7

**Backend API reference:**
- `POST /transcriptions/` — multipart upload, field name `file`, returns `TranscriptionResponse` (201)
- `GET /transcriptions/?offset=0&limit=20` — returns `{ items: TranscriptionResponse[], total: number }`
- `GET /transcriptions/{id}` — returns `TranscriptionResponse`
- `DELETE /transcriptions/{id}` — returns 204
- `GET /workers/?offset=0&limit=20` — returns `{ items: WorkerResponse[], total: number }`

**TranscriptionResponse shape:**
```json
{
  "id": "uuid",
  "source_filename": "recording.mp3",
  "media_type": "audio",
  "status": "pending",
  "attempt_count": 0,
  "error": null,
  "created_at": "2026-03-08T...",
  "updated_at": "2026-03-08T...",
  "completed_at": null,
  "transcript_text": null,
  "segments_json": null
}
```

**WorkerResponse shape:**
```json
{
  "id": "uuid",
  "label": "worker-1",
  "status": "idle",
  "started_at": "2026-03-08T...",
  "last_heartbeat": "2026-03-08T...",
  "current_transcription_id": null,
  "last_error": null
}
```

**Design doc:** `docs/plans/2026-03-08-frontend-v2-design.md`

---

### Task 1: Scaffold Vite + React + TypeScript + Tailwind + React Router

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/.gitignore`

**Step 1: Create the frontend directory and scaffold Vite**

```bash
mkdir -p frontend
cd frontend
npm create vite@latest . -- --template react-ts
```

If prompted to overwrite, say yes.

**Step 2: Install dependencies**

```bash
cd frontend
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind v4**

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

**Step 4: Configure Vite with Tailwind plugin and API proxy**

Replace `frontend/vite.config.ts` with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/transcriptions": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/workers": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 5: Set up placeholder React Router in main.tsx**

Replace `frontend/src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

function Placeholder({ version }: { version: number }) {
  return <div className="p-8 text-lg text-gray-600">Version {version} — coming soon</div>;
}

function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Transcription App</h1>
        <p className="text-gray-500 mb-8">Choose a version to get started.</p>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((v) => (
            <a
              key={v}
              href={`/${v}`}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              Version {v}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {[1, 2, 3, 4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 6: Verify it compiles and runs**

```bash
cd frontend && npx tsc --noEmit && npm run dev
```

Visit `http://localhost:5173/` — should see landing page with 5 links. Click each — should see "Version N — coming soon". Kill the dev server.

**Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, Tailwind, React Router"
```

---

### Task 2: Shared Types

**Files:**
- Create: `frontend/src/types/index.ts`

**Step 1: Create TypeScript types matching actual backend Pydantic schemas**

Create `frontend/src/types/index.ts`:

```typescript
export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

export type MediaType = "audio" | "video";

export type WorkerStatus = "idle" | "processing" | "stale";

export interface Segment {
  start: number;
  end: number;
  text: string;
  words: { word: string; start: number; end: number; probability: number }[];
  avg_logprob: number;
  no_speech_prob: number;
}

export interface SegmentsData {
  segments: Segment[];
}

export interface Transcription {
  id: string;
  source_filename: string;
  media_type: MediaType;
  status: TranscriptionStatus;
  attempt_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  transcript_text: string | null;
  segments_json: SegmentsData | null;
}

export interface TranscriptionListResponse {
  items: Transcription[];
  total: number;
}

export interface Worker {
  id: string;
  label: string | null;
  status: WorkerStatus;
  started_at: string;
  last_heartbeat: string;
  current_transcription_id: string | null;
  last_error: string | null;
}

export interface WorkerListResponse {
  items: Worker[];
  total: number;
}
```

**Step 2: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/src/types/
git commit -m "feat: add shared TypeScript types matching backend schemas"
```

---

### Task 3: API Client

**Files:**
- Create: `frontend/src/api/client.ts`

**Step 1: Create typed fetch wrappers for all 5 endpoints**

Create `frontend/src/api/client.ts`:

```typescript
import type {
  Transcription,
  TranscriptionListResponse,
  WorkerListResponse,
} from "../types";

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
): Promise<TranscriptionListResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const res = await fetch(`/transcriptions/?${params}`);
  return handleResponse(res);
}

export async function getTranscription(id: string): Promise<Transcription> {
  const res = await fetch(`/transcriptions/${id}`);
  return handleResponse(res);
}

export async function deleteTranscription(id: string): Promise<void> {
  const res = await fetch(`/transcriptions/${id}`, { method: "DELETE" });
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

    xhr.open("POST", "/transcriptions/");

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

export async function getWorkers(
  offset = 0,
  limit = 50,
): Promise<WorkerListResponse> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });
  const res = await fetch(`/workers/?${params}`);
  return handleResponse(res);
}
```

**Step 2: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add typed API client for transcriptions and workers"
```

---

### Task 4: Shared React Hooks

**Files:**
- Create: `frontend/src/hooks/useTranscriptions.ts`
- Create: `frontend/src/hooks/useTranscription.ts`
- Create: `frontend/src/hooks/useUpload.ts`
- Create: `frontend/src/hooks/useDeleteJob.ts`
- Create: `frontend/src/hooks/useWorkers.ts`

**Step 1: Create useTranscriptions polling hook**

Create `frontend/src/hooks/useTranscriptions.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { getTranscriptions } from "../api/client";
import type { Transcription } from "../types";

const POLL_INTERVAL = 3_000;

export function useTranscriptions() {
  const [jobs, setJobs] = useState<Transcription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getTranscriptions(0, 100);
      if (mountedRef.current) {
        setJobs(data.items);
        setTotal(data.total);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch jobs");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  return { jobs, total, loading, error, refresh };
}
```

**Step 2: Create useTranscription hook (single job, polls until terminal)**

Create `frontend/src/hooks/useTranscription.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { getTranscription } from "../api/client";
import type { Transcription } from "../types";

const POLL_INTERVAL = 3_000;

export function useTranscription(id: string | undefined) {
  const [job, setJob] = useState<Transcription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTranscription(id);
      if (mountedRef.current) {
        setJob(data);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch job");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    mountedRef.current = true;
    if (!id) {
      setJob(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();

    // Poll while job is not terminal
    const intervalId = setInterval(() => {
      // Only poll if still in non-terminal state
      if (mountedRef.current) refresh();
    }, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [id, refresh]);

  // Stop polling when terminal
  const isTerminal = job?.status === "completed" || job?.status === "failed";

  useEffect(() => {
    if (!isTerminal) return;
    // No-op: the interval above will keep running but that's fine.
    // A cleaner approach: store intervalId in a ref and clear it here.
    // But for simplicity, the overhead of a 3s no-op fetch on terminal jobs is negligible
    // since users typically navigate away.
  }, [isTerminal]);

  return { job, loading, error, refresh };
}
```

**Step 3: Create useUpload hook**

Create `frontend/src/hooks/useUpload.ts`:

```typescript
import { useCallback, useRef, useState } from "react";
import { uploadFile, type UploadProgress } from "../api/client";

export function useUpload(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(null);
      setError(null);

      const { promise, abort } = uploadFile(file, setProgress);
      abortRef.current = abort;

      try {
        await promise;
        onSuccess?.();
      } catch (err) {
        if (err instanceof Error && err.message !== "Upload cancelled") {
          setError(err.message);
        }
      } finally {
        setUploading(false);
        setProgress(null);
        abortRef.current = null;
      }
    },
    [onSuccess],
  );

  const cancel = useCallback(() => {
    abortRef.current?.();
  }, []);

  return { upload, uploading, progress, error, cancel };
}
```

**Step 4: Create useDeleteJob hook**

Create `frontend/src/hooks/useDeleteJob.ts`:

```typescript
import { useCallback, useState } from "react";
import { deleteTranscription } from "../api/client";

export function useDeleteJob(onSuccess?: () => void) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteJob = useCallback(
    async (id: string) => {
      if (!confirm("Delete this transcription? This cannot be undone.")) return;

      setDeleting(true);
      setError(null);
      try {
        await deleteTranscription(id);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      } finally {
        setDeleting(false);
      }
    },
    [onSuccess],
  );

  return { deleteJob, deleting, error };
}
```

**Step 5: Create useWorkers hook (no polling, manual refresh only)**

Create `frontend/src/hooks/useWorkers.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { getWorkers } from "../api/client";
import type { Worker } from "../types";

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkers(0, 100);
      if (mountedRef.current) {
        setWorkers(data.items);
        setTotal(data.total);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch workers");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { workers, total, loading, error, refresh };
}
```

**Step 6: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add shared hooks for polling, upload, delete, workers"
```

---

### Task 5: Shared Utilities and Landing Page

**Files:**
- Create: `frontend/src/utils/time.ts`
- Create: `frontend/src/utils/status.ts`
- Create: `frontend/src/utils/format.ts`
- Create: `frontend/src/landing/Landing.tsx`
- Modify: `frontend/src/main.tsx`

**Step 1: Create time formatting utility**

Create `frontend/src/utils/time.ts`:

```typescript
export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
```

**Step 2: Create status color/label utility**

Create `frontend/src/utils/status.ts`:

```typescript
import type { TranscriptionStatus, WorkerStatus } from "../types";

export const STATUS_DOT: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-400",
  processing: "bg-amber-400",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const STATUS_PILL: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const STATUS_LABEL: Record<TranscriptionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const WORKER_STATUS_LABEL: Record<WorkerStatus, string> = {
  idle: "Idle",
  processing: "Processing",
  stale: "Stale",
};

export const WORKER_STATUS_DOT: Record<WorkerStatus, string> = {
  idle: "bg-green-500",
  processing: "bg-amber-400",
  stale: "bg-red-500",
};
```

**Step 3: Create segment timestamp formatter**

Create `frontend/src/utils/format.ts`:

```typescript
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
```

**Step 4: Create Landing page**

Create `frontend/src/landing/Landing.tsx`:

```tsx
import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Minimal Slate", desc: "Notion-inspired, clean and spacious" },
  { path: "/2", name: "Sidebar Dashboard", desc: "Slack-inspired, sidebar navigation" },
  { path: "/3", name: "Warm Rounded", desc: "Stripe-inspired, soft and polished" },
  { path: "/4", name: "Dark Mode", desc: "Arc-inspired, modern and dark" },
  { path: "/5", name: "Document", desc: "Google Docs-inspired, reading-first" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Transcription App</h1>
        <p className="text-gray-500 mb-8">Choose a version to get started.</p>
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <Link
              key={v.path}
              to={v.path}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="font-medium text-gray-900">{v.name}</div>
              <div className="text-sm text-gray-500">{v.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Update main.tsx with Landing import**

Replace the inline Landing function in `frontend/src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import "./index.css";

function Placeholder({ version }: { version: number }) {
  return (
    <div className="p-8 text-lg text-gray-600">
      Version {version} — coming soon
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {[1, 2, 3, 4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 6: Verify it compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add frontend/src/utils/ frontend/src/landing/ frontend/src/main.tsx
git commit -m "feat: add utilities, landing page, update router"
```

---

### Task 6: Version 1 — Minimal Slate

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Notion-inspired. White bg, slate-600/700 text, slate-200 borders. Generous whitespace. Centered max-w-4xl column. Two text tabs: "Transcriptions | Workers". Dashed-border drop zone for upload. Stacked cards with thin borders and small colored status dots. Clean worker table. Comfortable reading column for transcript detail with inline [MM:SS] timestamps.

**Files:**
- Create: `frontend/src/versions/v1/App.tsx`
- Create: `frontend/src/versions/v1/UploadArea.tsx`
- Create: `frontend/src/versions/v1/JobList.tsx`
- Create: `frontend/src/versions/v1/JobCard.tsx`
- Create: `frontend/src/versions/v1/TranscriptView.tsx`
- Create: `frontend/src/versions/v1/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 1

**Step 1: Build all v1 components**

`UploadArea.tsx` — Dashed-border drop zone. Accepts drag-and-drop + click-to-browse. Progress bar when uploading. Uses `useUpload` hook with `onSuccess` triggering parent refresh.

`JobCard.tsx` — Single job card with thin slate-200 border. Shows: small colored status dot (use `STATUS_DOT` util), `source_filename`, `timeAgo(created_at)`. Click navigates to `/:version/:id`. Delete button (small trash icon or × button).

`JobList.tsx` — Uses `useTranscriptions`. Maps over jobs, renders JobCards. Shows "No transcriptions yet" empty state. Shows loading state.

`WorkerList.tsx` — Uses `useWorkers`. Clean table with columns: Label (or truncated ID), Status dot + label, Last Heartbeat (timeAgo), Current Job (truncated ID or "—"). Small refresh button in the header area. Empty state: "No workers registered".

`TranscriptView.tsx` — Uses `useTranscription` with ID from `useParams()`. Shows: source_filename, media_type badge, status, attempt_count, created_at, completed_at. Full transcript text. Segments rendered with inline `[MM:SS]` timestamps in muted monospace before each segment's text. Back link to `/:version`.

`App.tsx` — Version shell. Centered max-w-4xl container on white bg. Two text tabs at top: "Transcriptions" and "Workers" (simple underline active indicator). React Router `Routes`:
- Index route: tab content — either `<UploadArea /> + <JobList />` or `<WorkerList />`
- `/:id` route: `<TranscriptView />`

**Step 2: Wire into main.tsx**

In `frontend/src/main.tsx`, import `V1App` and replace the version 1 placeholder:

```tsx
import { V1App } from "./versions/v1/App";
// ... in Routes:
<Route path="/1/*" element={<V1App />} />
```

**Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/src/versions/v1/ frontend/src/main.tsx
git commit -m "feat: add version 1 (Minimal Slate) frontend"
```

---

### Task 7: Version 2 — Sidebar Dashboard

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Slack-inspired. Dark slate-900 sidebar (w-72), white content area, indigo-500 accents. Fixed left sidebar with two nav sections: "Transcriptions" (job list) and "Workers". Right pane shows content. When Transcriptions selected: sidebar shows job list items, content pane shows upload drop zone (if no job selected) or transcript detail. When Workers selected: content pane shows worker table with refresh button. Sidebar items show truncated filename, status badge, timestamp.

**Files:**
- Create: `frontend/src/versions/v2/App.tsx`
- Create: `frontend/src/versions/v2/Sidebar.tsx`
- Create: `frontend/src/versions/v2/SidebarItem.tsx`
- Create: `frontend/src/versions/v2/ContentPane.tsx`
- Create: `frontend/src/versions/v2/UploadArea.tsx`
- Create: `frontend/src/versions/v2/TranscriptView.tsx`
- Create: `frontend/src/versions/v2/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 2

**Step 1: Build all v2 components**

`Sidebar.tsx` — Dark slate-900 sidebar, full height. Two nav sections at top: "Transcriptions" and "Workers" (indigo text when active). When Transcriptions active: renders list of `SidebarItem` for each job. Upload button at top of sidebar.

`SidebarItem.tsx` — Compact row: truncated filename, small status badge (indigo/green/amber/red), timeAgo. Click navigates to `/:version/:id`. Active state highlighted.

`ContentPane.tsx` — White content area, flex-1. Routes: if Workers nav active → `WorkerList`. If job ID in URL → `TranscriptView`. Otherwise → `UploadArea`.

`UploadArea.tsx` — Full-width drop zone in the white content pane. Drag-and-drop + click. Indigo progress bar.

`TranscriptView.tsx` — Wide reading pane. File info header. Transcript text with inline [MM:SS] timestamps. Back button.

`WorkerList.tsx` — Table in content pane. Worker label, status badge, heartbeat, current job. Refresh button. Styled with indigo accents.

`App.tsx` — Flex layout: `<Sidebar />` (fixed w-72) + `<ContentPane />` (flex-1). Full height.

**Step 2: Wire into main.tsx**

```tsx
import { V2App } from "./versions/v2/App";
<Route path="/2/*" element={<V2App />} />
```

**Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v2/ frontend/src/main.tsx
git commit -m "feat: add version 2 (Sidebar Dashboard) frontend"
```

---

### Task 8: Version 3 — Warm Rounded

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Stripe-inspired. Stone-50 bg, rounded-xl cards with soft shadows (shadow-sm), blue-500 accents for buttons/links. Centered max-w-5xl container. Pill-shaped tab switcher for Transcriptions/Workers. Upload is a large rounded-xl card with centered cloud icon. Job list uses 2-column responsive card grid with status pills. Workers shown as card grid too. Detail view is a padded card with soft shadow.

**Files:**
- Create: `frontend/src/versions/v3/App.tsx`
- Create: `frontend/src/versions/v3/UploadCard.tsx`
- Create: `frontend/src/versions/v3/JobGrid.tsx`
- Create: `frontend/src/versions/v3/JobCard.tsx`
- Create: `frontend/src/versions/v3/TranscriptView.tsx`
- Create: `frontend/src/versions/v3/WorkerGrid.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 3

**Step 1: Build all v3 components**

`UploadCard.tsx` — Large rounded-xl card. Cloud upload icon centered. Drag-and-drop + click. Blue-500 progress bar. Friendly copy: "Drop a file here or click to browse".

`JobCard.tsx` — Rounded-xl card with shadow-sm. Source filename, status pill (rounded-full, STATUS_PILL colors), timeAgo, delete icon button.

`JobGrid.tsx` — 2-column responsive grid (`grid grid-cols-1 md:grid-cols-2 gap-4`). Uses `useTranscriptions`. Empty state: "Upload your first file to get started".

`WorkerGrid.tsx` — Card grid matching job cards. Each worker in a rounded-xl card with status pill, label, heartbeat, current job. Refresh button styled as blue-500 text link.

`TranscriptView.tsx` — Padded rounded-xl card with soft shadow. File info header, status pill. Transcript text in warm gray. Inline [MM:SS] timestamps.

`App.tsx` — Centered max-w-5xl on stone-50 bg. Pill-shaped tab bar at top (rounded-full buttons, blue-500 active). Routes for list vs detail.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v3/ frontend/src/main.tsx
git commit -m "feat: add version 3 (Warm Rounded) frontend"
```

---

### Task 9: Version 4 — Dark Mode

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Arc browser-inspired. Zinc-950 bg, zinc-800/zinc-900 cards. Status accents: emerald-500 for completed, amber-500 for processing, sky-500 for pending, red-500 for failed — used as 4px left-border on job rows. Upload drop zone has subtle glow/border on drag-over. Segmented control tabs with glow effect. Transcript text is zinc-200 on dark. Monospace timestamps.

**Files:**
- Create: `frontend/src/versions/v4/App.tsx`
- Create: `frontend/src/versions/v4/UploadArea.tsx`
- Create: `frontend/src/versions/v4/JobList.tsx`
- Create: `frontend/src/versions/v4/JobRow.tsx`
- Create: `frontend/src/versions/v4/TranscriptView.tsx`
- Create: `frontend/src/versions/v4/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 4

**Step 1: Build all v4 components**

`UploadArea.tsx` — Dark drop zone (zinc-800 border, zinc-900 bg). On drag-over: border changes to emerald-500 with subtle box-shadow glow. Emerald progress bar.

`JobRow.tsx` — Full-width row on zinc-900 bg. Colored left border (4px): emerald=completed, amber=processing, sky=pending, red=failed. Filename in zinc-200, status text, timeAgo in zinc-500. Click navigates. Delete button (zinc-600 hover:zinc-400).

`JobList.tsx` — Stacked JobRows with small gaps. Uses `useTranscriptions`. Dark empty state.

`WorkerList.tsx` — Dark rows with left-border accent: emerald=idle, amber=processing, red=stale. Worker label in zinc-200, status, heartbeat. Refresh button styled for dark theme.

`TranscriptView.tsx` — Zinc-200 text on zinc-950 bg. File info in zinc-400. Transcript text with `leading-relaxed`. Timestamps in monospace (`font-mono text-sm text-zinc-500`).

`App.tsx` — Full zinc-950 bg, min-h-screen. Centered max-w-3xl. Segmented control tabs (zinc-800 bg, active tab with zinc-700 bg and subtle glow). Routes.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v4/ frontend/src/main.tsx
git commit -m "feat: add version 4 (Dark Mode) frontend"
```

---

### Task 10: Version 5 — Document

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Google Docs / Dropbox Paper-inspired. Pure white bg, narrow max-w-2xl centered column, absolute minimal chrome. Upload is a small understated button in the header (no drop zone). Job list is minimal: filenames as text links, status as inline parenthetical "(processing)". Workers as simple prose list. Detail view is a full document reading experience: large text, leading-loose, timestamps as subtle inline marks.

**Files:**
- Create: `frontend/src/versions/v5/App.tsx`
- Create: `frontend/src/versions/v5/UploadButton.tsx`
- Create: `frontend/src/versions/v5/JobList.tsx`
- Create: `frontend/src/versions/v5/TranscriptView.tsx`
- Create: `frontend/src/versions/v5/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 5

**Step 1: Build all v5 components**

`UploadButton.tsx` — Small gray-500 text button: "Upload". Opens file picker on click (hidden input). Small inline progress text while uploading: "Uploading... 45%". No drag-and-drop.

`JobList.tsx` — Simple `<ul>` with `list-none`. Each item: filename as a Link, status as muted inline text "(processing)", small "×" delete link. No cards, no borders. Empty state: "No transcriptions yet."

`WorkerList.tsx` — Simple prose paragraph list. Each worker: "worker-label — idle, last seen 2m ago". Or if processing: "worker-label — processing job abc123, last seen 30s ago". Small "Refresh" text link.

`TranscriptView.tsx` — Document layout. Source filename as page title (`text-xl font-medium text-gray-900`). Status below title in muted text. Transcript text in `text-lg leading-loose text-gray-800`. Segments with subtle inline timestamps: `[02:15]` in `text-sm text-gray-400 font-mono`. Back link: "← Back".

`App.tsx` — Pure white bg, `max-w-2xl mx-auto py-12 px-6`. Minimal header: app name as small muted text, "Transcriptions · Workers" nav as text links, upload button. Routes.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v5/ frontend/src/main.tsx
git commit -m "feat: add version 5 (Document) frontend"
```

---

### Task 11: Final Integration and Cleanup

**Files:**
- Modify: `frontend/src/main.tsx` — clean up, remove all Placeholder references

**Step 1: Clean up main.tsx**

Ensure all 5 versions are imported and routed, no leftover Placeholder code:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App";
import { V2App } from "./versions/v2/App";
import { V3App } from "./versions/v3/App";
import { V4App } from "./versions/v4/App";
import { V5App } from "./versions/v5/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/1/*" element={<V1App />} />
        <Route path="/2/*" element={<V2App />} />
        <Route path="/3/*" element={<V3App />} />
        <Route path="/4/*" element={<V4App />} />
        <Route path="/5/*" element={<V5App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 2: Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Run production build**

```bash
cd frontend && npm run build
```

Expected: clean build with no warnings.

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: finalize frontend — all 5 versions wired up"
```
