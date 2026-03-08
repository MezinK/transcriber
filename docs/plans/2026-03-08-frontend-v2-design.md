# Frontend V2 Design — Transcription App

## Overview

Five visually distinct variants of the same transcription app frontend, served under `/1` through `/5`. All variants share identical functionality and shared logic (API client, hooks, types). Each variant has a dramatically different visual personality.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **API:** Fetch-based client proxied to FastAPI backend at `:8000`

## Features

1. **File Upload** — Drag-and-drop (v1-v4) or click-to-browse (v5) with XHR progress tracking
2. **Manage Transcriptions** — List, view detail, delete with confirmation
3. **View Transcription Status** — 3s polling, four states: pending/processing/completed/failed
4. **View Available Workers** — Fetch on mount, manual refresh button (no polling)

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── package.json
├── src/
│   ├── main.tsx                     # Router: /, /1/*, /2/*, /3/*, /4/*, /5/*
│   ├── index.css                    # @import "tailwindcss"
│   ├── api/
│   │   └── client.ts               # Typed fetch wrappers for all endpoints
│   ├── hooks/
│   │   ├── useTranscriptions.ts    # Polls GET /transcriptions/ every 3s
│   │   ├── useTranscription.ts     # Polls single GET /transcriptions/{id} every 3s (stops on terminal state)
│   │   ├── useUpload.ts            # XHR upload with progress
│   │   ├── useDeleteJob.ts         # DELETE with confirm()
│   │   └── useWorkers.ts           # Fetches GET /workers/ once on mount, exposes refresh()
│   ├── types/
│   │   └── index.ts                # TS types matching actual backend Pydantic schemas
│   ├── utils/
│   │   ├── time.ts                 # timeAgo(), formatDate()
│   │   └── status.ts               # Status color/label maps
│   ├── landing/
│   │   └── Landing.tsx             # Root "/" — links to all 5 versions
│   └── versions/
│       ├── v1/                     # Minimal Slate
│       ├── v2/                     # Sidebar Dashboard
│       ├── v3/                     # Warm Rounded
│       ├── v4/                     # Dark Mode
│       └── v5/                     # Document
```

## Backend API Endpoints Consumed (no backend changes)

| Function | Method | Endpoint |
|----------|--------|----------|
| `uploadFile(file, onProgress)` | POST | `/transcriptions/` |
| `getTranscriptions(offset, limit)` | GET | `/transcriptions/?offset=&limit=` |
| `getTranscription(id)` | GET | `/transcriptions/{id}` |
| `deleteTranscription(id)` | DELETE | `/transcriptions/{id}` |
| `getWorkers(offset, limit)` | GET | `/workers/?offset=&limit=` |

## TypeScript Types (matching actual backend schemas)

```typescript
type TranscriptionStatus = "pending" | "processing" | "completed" | "failed"
type MediaType = "audio" | "video"
type WorkerStatus = "idle" | "processing" | "stale"

interface Transcription {
  id: string
  source_filename: string
  media_type: MediaType
  status: TranscriptionStatus
  attempt_count: number
  error: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  transcript_text: string | null
  segments_json: SegmentsData | null
}

interface Segment {
  start: number
  end: number
  text: string
  words: { word: string; start: number; end: number; probability: number }[]
  avg_logprob: number
  no_speech_prob: number
}

interface SegmentsData {
  segments: Segment[]
}

interface Worker {
  id: string
  label: string | null
  status: WorkerStatus
  started_at: string
  last_heartbeat: string
  current_transcription_id: string | null
  last_error: string | null
}

interface TranscriptionListResponse {
  items: Transcription[]
  total: number
}

interface WorkerListResponse {
  items: Worker[]
  total: number
}
```

## Routing

- `/` — Landing page with links to all 5 versions
- `/:version` — Main view with two tabs: Transcriptions and Workers
- `/:version/:id` — Transcript detail view with inline timestamps

## Vite Proxy

Dev server on `:5173` proxies to backend at `:8000`:
- `/transcriptions` → `http://localhost:8000`
- `/workers` → `http://localhost:8000`
- `/health` → `http://localhost:8000`

## Version Designs

### `/1` — Minimal Slate (Notion-inspired)

- **Palette:** White bg, slate-600/700 text, slate-200 borders
- **Layout:** Centered max-w-4xl column. Two text tabs: "Transcriptions | Workers"
- **Upload:** Dashed-border drop zone at top with subtle hover state
- **Job list:** Stacked cards with thin borders, small colored status dot, filename, time ago
- **Workers:** Clean table — Label, Status dot, Heartbeat, Current Job. Small refresh button.
- **Detail:** Comfortable reading column, segments with inline [MM:SS] timestamps in muted text
- **Vibe:** Everything breathes, nothing shouts. Generous whitespace.

### `/2` — Sidebar Dashboard (Slack-inspired)

- **Palette:** Dark slate-900 sidebar, white content area, indigo-500 accents
- **Layout:** Fixed left sidebar (w-72) with two sections: job list + workers nav item. Right pane for content.
- **Upload:** Full-width drop zone in content pane when no job selected
- **Job list:** Sidebar items with truncated filename, status badge, timestamp
- **Workers:** Table in content pane when "Workers" is selected in sidebar nav. Refresh button.
- **Detail:** Wide reading pane with file info header and transcript body
- **Vibe:** Productivity tool. Sidebar navigation, wide reading pane.

### `/3` — Warm Rounded (Stripe-inspired)

- **Palette:** Stone-50 bg, rounded-xl cards, soft shadows, blue-500 accents
- **Layout:** Centered max-w-5xl. Pill-shaped tab switcher for Transcriptions/Workers
- **Upload:** Large rounded-xl card with centered cloud icon, smooth progress animation
- **Job list:** 2-column responsive card grid, status as colored pill badges
- **Workers:** Card grid matching the job cards — each worker in a rounded card with status pill. Refresh button.
- **Detail:** Padded card with soft shadow, warm typography
- **Vibe:** Polished, warm, trustworthy. Rounded everything.

### `/4` — Dark Mode (Arc browser-inspired)

- **Palette:** Zinc-950 bg, zinc-800/900 cards, emerald/amber/sky/red status accents
- **Layout:** Centered max-w-3xl. Segmented control tabs with glow effect
- **Upload:** Dark drop zone with subtle glow border on drag-over
- **Job list:** Stacked rows with colored left-border accent per status (4px)
- **Workers:** Dark rows with left-border accent: emerald=idle, amber=processing, red=stale. Refresh button.
- **Detail:** Zinc-200 text on zinc-950, monospace timestamps, comfortable contrast
- **Vibe:** Dark, modern, easy on the eyes.

### `/5` — Document (Google Docs-inspired)

- **Palette:** Pure white, narrow max-w-2xl column, minimal chrome
- **Layout:** Almost no UI — just content. Small text links for "Transcriptions · Workers" nav
- **Upload:** Small understated button in the header, no drop zone
- **Job list:** Minimal list — filenames as text links, status as inline parenthetical
- **Workers:** Simple prose list: "Worker-abc (idle, last seen 2m ago)". Small refresh link.
- **Detail:** Full document experience — large text, leading-loose, timestamps as subtle inline marks
- **Vibe:** The transcript IS the interface.

## Each Version's Component Tree

- `App.tsx` — Version shell, tab state, sub-routing
- `UploadArea.tsx` (or `UploadButton.tsx` for v5) — Upload UI
- `JobList.tsx` — Transcription list
- `JobCard.tsx` / `JobRow.tsx` — Individual transcription item
- `TranscriptView.tsx` — Detail view with inline timestamps
- `WorkerList.tsx` — Workers tab content

## UX Behavior (shared across all variants)

### Upload
- Drag-and-drop + click-to-browse in v1-v4; click-only in v5
- Progress bar/indicator during upload (XHR progress events)
- Error message if upload fails (file too large, unsupported type, network error)
- After successful upload, auto-refresh the job list via refresh()

### Transcription List
- 3-second polling interval keeps list fresh
- Status indicators styled per-variant (dots, pills, borders, text)
- Four states: pending (gray), processing (amber), completed (green), failed (red)
- Failed jobs show error message inline or on hover
- Empty state when no transcriptions exist (friendly message + prompt to upload)
- Click any transcription to navigate to /:version/:id detail view
- Delete button with confirm() dialog, optimistic removal from list

### Transcript Detail View
- Shows: filename, media type, status, attempt count, timestamps (created, updated, completed)
- Full transcript text displayed
- Segments with inline timestamps — each segment prefixed with [MM:SS] in muted/monospace styling
- Back button to return to list
- Polls every 3s while status is pending or processing — stops on completed or failed
- If failed: shows error message prominently

### Workers Tab
- Fetches once on mount (no polling)
- Small refresh button styled per variant to manually re-fetch
- Shows: worker label (or truncated ID if no label), status, last heartbeat (time ago), current transcription ID (if processing)
- Status indicators: idle (green/gray), processing (amber/blue), stale (red)
- Empty state when no workers registered
- Read-only — no actions on workers

### Error Handling
- All API errors caught and shown as user-friendly messages
- Loading skeletons or spinners styled per variant
- Network errors shown with retry suggestion
