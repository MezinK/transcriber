# Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React+Vite+Tailwind frontend with 5 visually distinct versions of a transcription app, all sharing the same hooks/API client, served under `/1` through `/5`.

**Architecture:** Single Vite project with React Router. Shared logic (API client, hooks, types) in `src/api/`, `src/hooks/`, `src/types/`. Each version in `src/versions/v{1-5}/` with its own component tree. Vite proxies API calls to the FastAPI backend at `:8000`.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7

**Backend API reference:**
- `POST /transcriptions/` — multipart upload, field name `file`, returns `TranscriptionResponse` (201)
- `GET /transcriptions/?offset=0&limit=20&status=pending` — returns `{ items: TranscriptionResponse[], total: number }`
- `GET /transcriptions/{id}` — returns `TranscriptionResponse`
- `DELETE /transcriptions/{id}` — returns 204
- `GET /health` — returns `{ status: "ok" }`

**TranscriptionResponse shape:**
```json
{
  "id": "uuid",
  "status": "pending|processing|completed|failed",
  "file_name": "recording.mp3",
  "media_type": "audio|video",
  "result_text": "string or null",
  "result_json": "object or null",
  "error": "string or null",
  "created_at": "2026-03-08T...",
  "completed_at": "2026-03-08T... or null"
}
```

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
- Create: `frontend/src/vite-env.d.ts`
- Create: `frontend/.gitignore`

**Step 1: Initialize the project**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
```

If prompted to overwrite, say yes — the directory should be empty.

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
      "/health": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 5: Set up React Router in main.tsx**

Replace `frontend/src/main.tsx` with:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Placeholder — will be replaced with real components
function Placeholder({ version }: { version: number }) {
  return <div className="p-8 text-lg">Version {version} — coming soon</div>;
}

function Landing() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Transcription App</h1>
      <ul className="space-y-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <li key={v}>
            <a href={`/${v}`} className="text-blue-600 underline">
              Version {v}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {[1, 2, 3, 4, 5].map((v) => (
          <Route
            key={v}
            path={`/${v}/*`}
            element={<Placeholder version={v} />}
          />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 6: Verify it runs**

```bash
cd frontend && npm run dev
```

Visit `http://localhost:5173/` — should see landing page with 5 links. Click each link — should see "Version N — coming soon". Kill the dev server.

**Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, Tailwind, React Router"
```

---

### Task 2: Shared Types and API Client

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`

**Step 1: Create TypeScript types**

Create `frontend/src/types/index.ts`:

```typescript
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
```

**Step 2: Create API client**

Create `frontend/src/api/client.ts`:

```typescript
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
```

**Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/src/types/ frontend/src/api/
git commit -m "feat: add shared types and API client for transcription endpoints"
```

---

### Task 3: Shared React Hooks

**Files:**
- Create: `frontend/src/hooks/useTranscriptions.ts`
- Create: `frontend/src/hooks/useUpload.ts`
- Create: `frontend/src/hooks/useDeleteJob.ts`
- Create: `frontend/src/hooks/useTranscription.ts`

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

**Step 2: Create useTranscription hook (single job)**

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
    const intervalId = setInterval(refresh, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [id, refresh]);

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

**Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add shared hooks for polling, upload, delete"
```

---

### Task 4: Shared UI utilities and landing page

**Files:**
- Create: `frontend/src/utils/time.ts`
- Create: `frontend/src/utils/status.ts`
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

**Step 2: Create status color utility**

Create `frontend/src/utils/status.ts`:

```typescript
import type { TranscriptionStatus } from "../types";

export const STATUS_COLORS: Record<TranscriptionStatus, string> = {
  pending: "text-gray-500",
  processing: "text-amber-500",
  completed: "text-green-600",
  failed: "text-red-500",
};

export const STATUS_BG: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<TranscriptionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
```

**Step 3: Create Landing page component**

Create `frontend/src/landing/Landing.tsx`:

```typescript
import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Clean Neutral", desc: "Minimal and spacious" },
  { path: "/2", name: "Sidebar Nav", desc: "Dashboard with sidebar navigation" },
  { path: "/3", name: "Warm Professional", desc: "Polished with soft accents" },
  { path: "/4", name: "Modern Dark", desc: "Dark theme, easy on the eyes" },
  { path: "/5", name: "Document-Focused", desc: "Reading-first, like a doc editor" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Transcription App
        </h1>
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

**Step 4: Update main.tsx with real imports**

Replace `frontend/src/main.tsx` — keep placeholder version components for now but import real Landing:

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import "./index.css";

// Placeholders — replaced one at a time in tasks 5-9
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
          <Route
            key={v}
            path={`/${v}/*`}
            element={<Placeholder version={v} />}
          />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 5: Verify it compiles and runs**

```bash
cd frontend && npx tsc --noEmit && npm run dev
```

Visit `http://localhost:5173/` — should see styled landing page with 5 cards. Kill dev server.

**Step 6: Commit**

```bash
git add frontend/src/utils/ frontend/src/landing/ frontend/src/main.tsx
git commit -m "feat: add utilities, landing page, wire up router"
```

---

### Task 5: Version 1 — Clean Neutral

Use the `frontend-design` skill for this task. The design brief is:

**Clean Neutral** — Notion-inspired. White bg, slate-600/700 text, slate-200 borders. Generous whitespace, clear typography hierarchy. Dashed-border drop zone for upload, stacked cards for job list with small colored status dots, comfortable max-width reading column for transcript detail.

**Files:**
- Create: `frontend/src/versions/v1/App.tsx`
- Create: `frontend/src/versions/v1/UploadArea.tsx`
- Create: `frontend/src/versions/v1/JobList.tsx`
- Create: `frontend/src/versions/v1/JobCard.tsx`
- Create: `frontend/src/versions/v1/TranscriptView.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 1

**Step 1: Build all v1 components**

`frontend/src/versions/v1/UploadArea.tsx` — Drag-and-drop zone with dashed border. Shows progress bar when uploading. Uses `useUpload` hook.

`frontend/src/versions/v1/JobCard.tsx` — Single job card. Shows file name, status dot (gray/amber/green/red), time ago. Click navigates to detail. Delete button.

`frontend/src/versions/v1/JobList.tsx` — Maps over jobs from `useTranscriptions`, renders JobCards. Shows empty state. Shows loading skeleton.

`frontend/src/versions/v1/TranscriptView.tsx` — Uses `useTranscription` with ID from URL params. Shows file name, status, transcript text in a readable column. Back button.

`frontend/src/versions/v1/App.tsx` — Version shell. Uses React Router `Routes` for sub-routing:
- Index route: `<UploadArea />` + `<JobList />`
- `/:id` route: `<TranscriptView />`

**Step 2: Wire into main.tsx**

In `frontend/src/main.tsx`, replace the Placeholder for version 1:

```typescript
import { V1App } from "./versions/v1/App";
// ... in Routes:
<Route path="/1/*" element={<V1App />} />
```

**Step 3: Verify**

```bash
cd frontend && npx tsc --noEmit && npm run dev
```

Visit `http://localhost:5173/1` — should see the Clean Neutral UI with upload area and empty job list. If the backend is running, test upload + job list + detail view + delete.

**Step 4: Commit**

```bash
git add frontend/src/versions/v1/ frontend/src/main.tsx
git commit -m "feat: add version 1 (Clean Neutral) frontend"
```

---

### Task 6: Version 2 — Sidebar Nav

Use the `frontend-design` skill for this task. The design brief is:

**Sidebar Nav** — Slack-inspired. Dark slate-900 sidebar, white content area, indigo accents. Fixed left sidebar (w-72) shows job list as compact items with status badges. Right pane shows either upload drop zone (when no job selected) or transcript detail. Clicking a job in sidebar loads it in the content pane.

**Files:**
- Create: `frontend/src/versions/v2/App.tsx`
- Create: `frontend/src/versions/v2/Sidebar.tsx`
- Create: `frontend/src/versions/v2/SidebarItem.tsx`
- Create: `frontend/src/versions/v2/ContentPane.tsx`
- Create: `frontend/src/versions/v2/UploadArea.tsx`
- Create: `frontend/src/versions/v2/TranscriptView.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 2

**Step 1: Build all v2 components**

`Sidebar.tsx` — Dark sidebar with job list. Uses `useTranscriptions`. Upload button at top of sidebar. Each job is a `SidebarItem`.

`SidebarItem.tsx` — Compact: file name truncated, status badge (indigo for processing, green completed, etc.), time ago.

`ContentPane.tsx` — Router: if a job ID is in the URL, show `TranscriptView`. Otherwise show `UploadArea`.

`UploadArea.tsx` — Full-width drop zone in the white content area. Drag-and-drop + click. Progress bar.

`TranscriptView.tsx` — Full transcript in the wide content pane. File info at top, transcript text below.

`App.tsx` — Flex layout: `<Sidebar />` (fixed width) + `<ContentPane />` (flex-1).

**Step 2: Wire into main.tsx**

```typescript
import { V2App } from "./versions/v2/App";
<Route path="/2/*" element={<V2App />} />
```

**Step 3: Verify and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v2/ frontend/src/main.tsx
git commit -m "feat: add version 2 (Sidebar Nav) frontend"
```

---

### Task 7: Version 3 — Warm Professional

Use the `frontend-design` skill for this task. The design brief is:

**Warm Professional** — Stripe-inspired. Stone-50 bg, rounded-xl cards with soft shadows (`shadow-sm`), blue-500 accents for buttons/links, warm gray text. Upload is a large rounded card with a centered icon and smooth animation. Job list uses a 2-column card grid with status pills. Detail view is a padded card with soft shadow.

**Files:**
- Create: `frontend/src/versions/v3/App.tsx`
- Create: `frontend/src/versions/v3/UploadCard.tsx`
- Create: `frontend/src/versions/v3/JobGrid.tsx`
- Create: `frontend/src/versions/v3/JobCard.tsx`
- Create: `frontend/src/versions/v3/TranscriptView.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 3

**Step 1: Build all v3 components**

`UploadCard.tsx` — Large rounded-xl card. Upload icon centered. Drag-and-drop. Blue progress bar. Friendly copy.

`JobCard.tsx` — Rounded-xl card with shadow-sm. File name, status pill (rounded-full, colored bg), time ago, delete icon.

`JobGrid.tsx` — 2-column responsive grid of JobCards. Uses `useTranscriptions`. Empty state with friendly message.

`TranscriptView.tsx` — Padded card with soft shadow. File info header, transcript text in warm gray.

`App.tsx` — Centered max-w-4xl container on stone-50 bg. Sub-routes for list vs detail.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v3/ frontend/src/main.tsx
git commit -m "feat: add version 3 (Warm Professional) frontend"
```

---

### Task 8: Version 4 — Modern Dark

Use the `frontend-design` skill for this task. The design brief is:

**Modern Dark** — Arc browser-inspired. Zinc-950 bg, zinc-800/zinc-900 cards. Status accents: emerald for completed, amber for processing, sky for pending, red for failed — used as left-border color on job rows. Upload drop zone has a subtle glow/border effect on drag-over. Transcript text is zinc-200 on dark, comfortable contrast. Monospace display for segment timestamps.

**Files:**
- Create: `frontend/src/versions/v4/App.tsx`
- Create: `frontend/src/versions/v4/UploadArea.tsx`
- Create: `frontend/src/versions/v4/JobList.tsx`
- Create: `frontend/src/versions/v4/JobRow.tsx`
- Create: `frontend/src/versions/v4/TranscriptView.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 4

**Step 1: Build all v4 components**

`UploadArea.tsx` — Dark drop zone (zinc-800 border). On drag-over: border glows with a subtle box-shadow. Progress bar with emerald accent.

`JobRow.tsx` — Full-width row on zinc-900. Colored left border (4px) per status. File name, status text, time ago. Click navigates. Delete button (zinc-600 hover:zinc-400).

`JobList.tsx` — Stacked JobRows. Uses `useTranscriptions`. Dark empty state.

`TranscriptView.tsx` — Zinc-200 text on zinc-950 bg. File info in zinc-400. Transcript text with good line-height. Timestamps in monospace if segments available.

`App.tsx` — Full dark bg (zinc-950). Centered max-w-3xl container. Header with "back to list" link.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v4/ frontend/src/main.tsx
git commit -m "feat: add version 4 (Modern Dark) frontend"
```

---

### Task 9: Version 5 — Document-Focused

Use the `frontend-design` skill for this task. The design brief is:

**Document-Focused** — Google Docs / Dropbox Paper-inspired. Pure white bg, narrow centered column (max-w-2xl), absolute minimal chrome. Upload is a small, understated button at top (not a big drop zone). Job list is minimal: just file names as text links with inline status. Detail view is a full document reading experience: large sans-serif text, wide line-height (leading-relaxed or leading-loose), the transcript IS the interface. Page title is the file name.

**Files:**
- Create: `frontend/src/versions/v5/App.tsx`
- Create: `frontend/src/versions/v5/UploadButton.tsx`
- Create: `frontend/src/versions/v5/JobList.tsx`
- Create: `frontend/src/versions/v5/TranscriptView.tsx`
- Modify: `frontend/src/main.tsx` — replace Placeholder for version 5

**Step 1: Build all v5 components**

`UploadButton.tsx` — Small gray button in the header area. Opens file picker on click. Small inline progress text while uploading. No drag-and-drop here — this version is minimal.

`JobList.tsx` — Simple `<ul>` with file names as links. Status shown as subtle inline text: "(processing)", "(completed)". Delete as small "×" next to each. No cards, no borders.

`TranscriptView.tsx` — Document layout. File name as page title (`text-xl font-medium`). Status below title. Transcript text in `text-lg leading-loose` — spacious and readable. Segments as soft horizontal dividers if available.

`App.tsx` — Pure white, centered `max-w-2xl mx-auto py-12 px-6`. Minimal header with app name and upload button. Sub-routes.

**Step 2: Wire into main.tsx and verify**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/versions/v5/ frontend/src/main.tsx
git commit -m "feat: add version 5 (Document-Focused) frontend"
```

---

### Task 10: Final integration and cleanup

**Files:**
- Modify: `frontend/src/main.tsx` — remove all Placeholder references, ensure clean imports
- Modify: `docker-compose.yml` — optionally add frontend service

**Step 1: Clean up main.tsx**

Ensure all 5 versions are imported and routed, no leftover Placeholder code:

```typescript
import { V1App } from "./versions/v1/App";
import { V2App } from "./versions/v2/App";
import { V3App } from "./versions/v3/App";
import { V4App } from "./versions/v4/App";
import { V5App } from "./versions/v5/App";
```

**Step 2: Run full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Run dev server and manually verify all 5 versions**

```bash
cd frontend && npm run dev
```

Visit each version: `/1`, `/2`, `/3`, `/4`, `/5`. For each, verify:
- Upload area renders correctly
- Job list shows (if backend running)
- Navigation to detail view works
- Delete works
- Back navigation works
- No console errors

**Step 4: Build production bundle**

```bash
cd frontend && npm run build
```

Expected: clean build with no warnings.

**Step 5: Commit**

```bash
git add -A frontend/
git commit -m "feat: finalize frontend with all 5 versions"
```
