# Dark Mode Iterations Design — Transcription App

## Overview

Five dark-mode iterations of the transcription app, all sharing the dark aesthetic DNA but each with a distinct color scheme, font, AND layout approach. Served under `/1` through `/5`. All share the same hooks/types/utils/API client.

## Variants

### `/1` — Obsidian (Original V4, kept as-is)
- **Vibe:** Arc browser-inspired
- **Palette:** Zinc-950 bg, emerald/amber/sky/red accents
- **Layout:** Centered max-w-3xl column, stacked rows with colored left-borders, segmented tabs
- **Font:** Geist Sans / IBM Plex Sans
- **Note:** This is the existing V4 moved to `/1`. No code changes needed beyond renaming.

### `/2` — Void (Terminal/hacker)
- **Vibe:** Terminal aesthetic. Monospace everything. Neon green on black.
- **Palette:** Pure black (#000) bg, neutral-900 surfaces, neon green-400 primary, yellow-300 warnings, red-400 errors
- **Layout:** Full-width table layout — no cards. Transcriptions as a data table. Upload as compact bar at top. Workers as second table.
- **Font:** JetBrains Mono — monospace for everything
- **Unique:** Status as uppercase text badges `[PENDING]` `[PROCESSING]`. Blinking cursor on processing items. Exact HH:MM:SS timestamps.

### `/3` — Indigo Night (Linear.app meets midnight)
- **Vibe:** Deep indigo-navy, glass-morphism cards
- **Palette:** Slate-950 with blue tint (#0a0f1e), cards bg-white/5 backdrop-blur, indigo-400/violet-400 accents
- **Layout:** Sidebar layout. Left sidebar with job list, right pane for content. Frosted-glass effect.
- **Font:** Satoshi — geometric, modern
- **Unique:** Backdrop-blur glass cards. Active sidebar item has indigo glow ring. Gradient border animation on upload.

### `/4` — Ember (Warm dark luxury)
- **Vibe:** Luxury car dashboard at night. Warm amber/orange.
- **Palette:** Neutral-950 (#0c0a09) bg, stone-900 surfaces, amber-500/orange-500 primary, warm status colors
- **Layout:** Card grid — 2-column grid for transcriptions. Upload as hero card at top. Workers as horizontal scroll cards.
- **Font:** General Sans — warm geometric
- **Unique:** Warm shadow-lg with amber tint. Hover lift with translateY. Amber gradient progress bar.

### `/5` — Abyss (Ultra-minimal dark)
- **Vibe:** iA Writer dark mode. Almost no UI. Content-focused.
- **Palette:** Gray-950 (#030712) bg, gray-200 text, gray-800 borders. Single accent: cyan-400.
- **Layout:** Narrow max-w-xl column. No tabs — transcriptions default, "Workers" as footer link. Upload as "+" button. Job list as text lines.
- **Font:** Literata — editorial/reading font
- **Unique:** Most minimal variant. Dark reading experience with leading-loose. Almost no chrome.

## Routing
- `/` — Landing page linking to `/1` through `/5`
- `/:version` — Main view with tabs (Transcriptions + Workers)
- `/:version/:id` — Transcript detail

## What Gets Deleted
- V1 (Minimal Slate) — `src/versions/v1/`
- V2 (Sidebar Dashboard) — `src/versions/v2/`
- V3 (Warm Rounded) — `src/versions/v3/`
- V5 (Document) — `src/versions/v5/`
- Landing page updated with new variant names

## Shared Infrastructure (unchanged)
- `src/types/index.ts` — TypeScript types
- `src/api/client.ts` — API client
- `src/hooks/` — All 5 hooks (useTranscriptions, useTranscription, useUpload, useDeleteJob, useWorkers)
- `src/utils/` — time, status, format utilities
