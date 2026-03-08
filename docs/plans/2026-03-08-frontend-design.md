# Frontend Design — Transcription App

## Overview

Five visually distinct versions of the same transcription app, served under `/1` through `/5`. All versions share identical functionality (upload, job list, transcript view, delete) and shared logic (API client, hooks, types). Each version has a unique corporate-professional aesthetic suitable for use by doctors in a professional setting — none are medical-themed.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v7
- **API:** Fetch-based client proxied to FastAPI backend at `:8000`

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                    # Router setup: /, /1, /2, /3, /4, /5
│   ├── api/
│   │   └── client.ts              # Typed fetch wrappers for all endpoints
│   ├── hooks/
│   │   ├── useTranscriptions.ts   # Polls job list every 3s
│   │   ├── useUpload.ts           # Upload with progress tracking (XHR)
│   │   └── useDeleteJob.ts        # Delete with optimistic removal
│   ├── types/
│   │   └── index.ts               # TS types matching backend Pydantic schemas
│   ├── versions/
│   │   ├── v1/                    # Clean Neutral
│   │   ├── v2/                    # Sidebar Nav
│   │   ├── v3/                    # Warm Professional
│   │   ├── v4/                    # Modern Dark
│   │   └── v5/                    # Document-Focused
│   └── landing/
│       └── Landing.tsx            # Root "/" — links to all 5 versions
```

## Shared Logic

### API Client (`src/api/client.ts`)

| Function | Method | Endpoint |
|----------|--------|----------|
| `uploadFile(file)` | POST | `/transcriptions/` |
| `getTranscriptions(skip?, limit?)` | GET | `/transcriptions/` |
| `getTranscription(id)` | GET | `/transcriptions/{id}` |
| `deleteTranscription(id)` | DELETE | `/transcriptions/{id}` |

### Hooks

- **`useTranscriptions()`** — Polls `GET /transcriptions/` every 3 seconds. Returns `{ jobs, loading, error }`.
- **`useUpload()`** — Wraps XMLHttpRequest for progress tracking. Returns `{ upload(file), uploading, progress, error }`.
- **`useDeleteJob()`** — Calls DELETE then invalidates job list. Returns `{ deleteJob(id), deleting }`.

### Types

```typescript
type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface Transcription {
  id: string
  status: TranscriptionStatus
  file_name: string
  media_type: 'AUDIO' | 'VIDEO'
  result_text: string | null
  result_json: object | null
  error: string | null
  retry_count: number
  created_at: string
  completed_at: string | null
}

interface PaginatedResponse {
  items: Transcription[]
  total: number
  skip: number
  limit: number
}
```

### Routing

- `/` — Landing page with links to all 5 versions
- `/:version` — Main view (upload area + job list)
- `/:version/:id` — Transcript detail view

## Version Designs

### `/1` — Clean Neutral

- **Palette:** White bg, slate-600/700 text, slate-200 borders
- **Upload:** Dashed border drop zone centered at top, subtle hover
- **Job list:** Stacked cards with thin borders, status as small colored dot
- **Detail:** Comfortable max-width reading column
- **Vibe:** Notion — everything breathes, nothing shouts

### `/2` — Sidebar Nav

- **Palette:** Dark slate-900 sidebar, white content area, indigo accents
- **Layout:** Fixed left sidebar with job list; right pane for upload or detail
- **Upload:** Full-width drop zone in content pane when no job selected
- **Job list:** Sidebar items with file name, status badge, timestamp
- **Vibe:** Slack — sidebar navigation, wide reading pane

### `/3` — Warm Professional

- **Palette:** Stone-50 bg, rounded-xl cards, soft shadows, blue-500 accents
- **Upload:** Large rounded card with icon, smooth upload animation
- **Job list:** 2-column card grid, file name + status pill + time ago
- **Detail:** Card-based reading view, padded with soft shadow
- **Vibe:** Stripe — polished, warm, trustworthy

### `/4` — Modern Dark

- **Palette:** Zinc-950 bg, zinc-800 cards, emerald/amber/sky status accents
- **Upload:** Bordered drop zone with glow effect on drag-over
- **Job list:** Stacked rows, status as colored left-border accent
- **Detail:** Light text on dark, comfortable reading contrast
- **Vibe:** Arc browser — dark, modern, easy on the eyes

### `/5` — Document-Focused

- **Palette:** Pure white, narrow centered column (max-w-2xl), minimal chrome
- **Upload:** Small understated upload button at top
- **Job list:** Minimal list, file names as links, status as inline text
- **Detail:** Full document experience — large text, wide line-height
- **Vibe:** Google Docs — the transcript IS the interface

## UX Details

### Upload
- Drag-and-drop + click-to-browse in all versions
- Progress bar during upload (XHR progress events)
- Error message if upload fails (file too large, network error)
- Optimistic add to job list after successful POST

### Job List
- 3-second polling interval on main view
- Status indicators styled per version aesthetic
- Failed jobs show error inline or on hover
- Empty state when no jobs exist

### Transcript Detail
- Full `result_text` as readable prose
- Segments with timestamps shown as expandable sections (from `result_json`)
- Back button to main view
- Loading state while fetching

### Delete
- Browser `confirm()` before deleting
- Optimistic removal from list

### Error Handling
- All API errors caught and shown as user-friendly messages
- Loading skeletons/spinners styled per version

## Dev Setup

- Vite dev server on `:5173` with proxy to `:8000` for `/transcriptions/*` and `/health`
- Added to `docker-compose.yml` as optional frontend service
- Hot module replacement for fast iteration
