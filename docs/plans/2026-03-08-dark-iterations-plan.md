# Dark Mode Iterations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 5 mixed-aesthetic frontend variants with 5 dark-mode iterations, each with distinct color scheme, font, AND layout — all based on the V4 Dark Mode DNA.

**Architecture:** Delete old v1/v2/v3/v5 directories. Move current v4 to v1 (Obsidian). Create 4 new variants (Void, Indigo Night, Ember, Abyss) in v2-v5. Update Landing and main.tsx. All variants share existing hooks/types/utils/API client.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7

**Design doc:** `docs/plans/2026-03-08-dark-iterations-design.md`

**Backend API (unchanged):**
- `POST /transcriptions/` — multipart upload
- `GET /transcriptions/?offset=0&limit=20` — list
- `GET /transcriptions/{id}` — detail
- `DELETE /transcriptions/{id}` — delete
- `GET /workers/?offset=0&limit=20` — workers

**Shared infrastructure (unchanged):**
- `src/types/index.ts`, `src/api/client.ts`, `src/hooks/*`, `src/utils/*`

---

### Task 1: Delete old variants, move V4 to V1, update Landing and main.tsx

**Files:**
- Delete: `frontend/src/versions/v1/` (old Minimal Slate)
- Delete: `frontend/src/versions/v2/` (old Sidebar Dashboard)
- Delete: `frontend/src/versions/v3/` (old Warm Rounded)
- Delete: `frontend/src/versions/v5/` (old Document)
- Rename: `frontend/src/versions/v4/` → `frontend/src/versions/v1/`
- Modify: all files in new `v1/` — update route paths from `/4` to `/1`
- Modify: `frontend/src/landing/Landing.tsx`
- Modify: `frontend/src/main.tsx`

**Step 1: Delete old variants**

```bash
cd /Users/mzn/dev/codex/transcriber/frontend
rm -rf src/versions/v1 src/versions/v2 src/versions/v3 src/versions/v5
```

**Step 2: Move v4 to v1**

```bash
mv src/versions/v4 src/versions/v1
```

**Step 3: Update all `/4` route references to `/1` in v1 files**

In `src/versions/v1/App.tsx`, change the navigate path from `/4` to `/1`:
```typescript
// Change this line in handleUploadSuccess:
navigate("/1");
// The location.pathname check also needs updating:
if (location.pathname !== "/1") {
```

In `src/versions/v1/JobRow.tsx`, change the navigate from `/4/${job.id}` to `/1/${job.id}`:
```typescript
onClick={() => navigate(`/1/${job.id}`)}
```

In `src/versions/v1/TranscriptView.tsx`, change the back navigation from `/4` to `/1`:
```typescript
onClick={() => navigate("/1")}
```

**Step 4: Update Landing page**

Replace `frontend/src/landing/Landing.tsx` with:

```tsx
import { Link } from "react-router-dom";

const VERSIONS = [
  { path: "/1", name: "Obsidian", desc: "Arc-inspired, emerald accents, stacked rows" },
  { path: "/2", name: "Void", desc: "Terminal aesthetic, neon green, data tables" },
  { path: "/3", name: "Indigo Night", desc: "Glass-morphism, sidebar layout, indigo glow" },
  { path: "/4", name: "Ember", desc: "Warm dark luxury, amber accents, card grid" },
  { path: "/5", name: "Abyss", desc: "Ultra-minimal, cyan accent, reading-focused" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Transcription App</h1>
        <p className="text-zinc-500 mb-8">Choose a variant.</p>
        <div className="space-y-3">
          {VERSIONS.map((v) => (
            <Link
              key={v.path}
              to={v.path}
              className="block p-4 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
            >
              <div className="font-medium text-zinc-100">{v.name}</div>
              <div className="text-sm text-zinc-500">{v.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Update main.tsx**

Replace `frontend/src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App";
import "./index.css";

function Placeholder({ version }: { version: number }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500">Version {version} — coming soon</p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/1/*" element={<V1App />} />
        {[2, 3, 4, 5].map((v) => (
          <Route key={v} path={`/${v}/*`} element={<Placeholder version={v} />} />
        ))}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

**Step 6: Verify**

```bash
cd /Users/mzn/dev/codex/transcriber/frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add -A frontend/src/versions/ frontend/src/landing/ frontend/src/main.tsx
git commit -m "refactor: delete old variants, move V4 Dark Mode to /1 (Obsidian)"
```

---

### Task 2: Version 2 — Void (Terminal/Hacker)

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Terminal/hacker aesthetic. Monospace EVERYTHING. Neon green on pure black. No cards — data tables instead. Upload as a compact command bar. Status as uppercase `[PENDING]` badges. Blinking cursor on processing items. Timestamps as exact HH:MM:SS.

**Palette:**
- Background: pure black (#000000)
- Surfaces: neutral-900
- Primary: green-400 (neon green)
- Warning: yellow-300
- Error: red-400
- Muted: neutral-500
- Text: green-100/green-200

**Font:** "JetBrains Mono" from Google Fonts — monospace for EVERYTHING

**Layout:** Full-width max-w-5xl. No cards, no rounded corners. Everything is rectangular and sharp. Transcriptions and Workers as data tables with headers. Upload as a compact bar at the very top.

**Files:**
- Create: `frontend/src/versions/v2/App.tsx`
- Create: `frontend/src/versions/v2/UploadBar.tsx`
- Create: `frontend/src/versions/v2/JobTable.tsx`
- Create: `frontend/src/versions/v2/TranscriptView.tsx`
- Create: `frontend/src/versions/v2/WorkerTable.tsx`
- Modify: `frontend/src/main.tsx` — wire V2App

**Component details:**

`App.tsx` — Export as `V2App`. Pure black bg (#000). JetBrains Mono font. max-w-5xl centered. Title: "> transcriber_" with blinking cursor animation. Two text tabs: `[TRANSCRIPTIONS]` and `[WORKERS]` in uppercase mono green-400. Active has underline. Routes for index + `:id`.

`UploadBar.tsx` — Compact bar at top, NOT a big drop zone. neutral-900 bg, py-2 px-4. Text: `> upload_file` in green-400. Drag-and-drop + click. During upload: `> uploading... [████░░░░░░] 45%` style progress in mono. Error in red-400.

`JobTable.tsx` — Full data table. Header row: `FILENAME | STATUS | CREATED | ACTIONS` in green-400/60 uppercase text-xs. Each row: filename in green-200, status as `[PENDING]` `[PROCESSING]` `[COMPLETED]` `[FAILED]` in uppercase with color (green-400=pending, yellow-300=processing, green-300=completed, red-400=failed). Processing rows have a blinking ● character. Created as exact timestamp. Delete as `[DEL]` text. Click row to navigate. Rows separated by neutral-800 border-b.

`WorkerTable.tsx` — Same table style. Columns: `LABEL | STATUS | HEARTBEAT | CURRENT_JOB`. Refresh button as `[REFRESH]` in green-400. No polling.

`TranscriptView.tsx` — Back: `< back` in green-400. Title in green-100. Status badge in uppercase. Segments with `[HH:MM:SS]` exact timestamps (use formatTimestamp but format as HH:MM:SS for this variant). All text in mono green-200. Failed errors in red-400.

**After building, update main.tsx:**
```tsx
import { V2App } from "./versions/v2/App";
<Route path="/2/*" element={<V2App />} />
```

**Verify:** `npx tsc --noEmit` — no errors.
**Commit:** `git commit -m "feat: add version 2 (Void) — terminal dark theme"`

---

### Task 3: Version 3 — Indigo Night (Glass sidebar)

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Linear.app meets midnight. Deep indigo-navy background with glass-morphism cards. Sidebar layout. Indigo/violet accents. Frosted glass effect on surfaces.

**Palette:**
- Background: custom deep navy `#0a0f1e`
- Surfaces: `bg-white/5` with `backdrop-blur-md` (glass effect)
- Primary: indigo-400
- Secondary: violet-400
- Status: indigo-300=pending, violet-400=processing, emerald-400=completed, rose-400=failed
- Text: slate-200 body, slate-400 muted, white headings

**Font:** "Satoshi" from a CDN or fallback to "Plus Jakarta Sans" from Google Fonts

**Layout:** Full-height sidebar layout (like old V2 but dark). Left sidebar (w-64) with glass bg, job list. Right content pane. Upload in content pane. Workers as table in content pane.

**Files:**
- Create: `frontend/src/versions/v3/App.tsx`
- Create: `frontend/src/versions/v3/Sidebar.tsx`
- Create: `frontend/src/versions/v3/SidebarItem.tsx`
- Create: `frontend/src/versions/v3/UploadArea.tsx`
- Create: `frontend/src/versions/v3/TranscriptView.tsx`
- Create: `frontend/src/versions/v3/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — wire V3App

**Component details:**

`App.tsx` — Export as `V3App`. min-h-screen with bg `#0a0f1e`. Flex layout: Sidebar + content pane. Satoshi/Plus Jakarta Sans font. useTranscriptions at top level shared between sidebar and content.

`Sidebar.tsx` — w-64 min-h-screen, `bg-white/5 backdrop-blur-md border-r border-white/10`. Title "Transcriber" in white font-semibold px-5 py-4. Two nav items: "Transcriptions" and "Workers" — active has `bg-white/10` and left border-2 border-indigo-400. When Transcriptions active: job list as SidebarItems below. Small upload button (indigo bg) at top of list.

`SidebarItem.tsx` — px-4 py-2.5. Glass hover: `hover:bg-white/5`. Active: `bg-white/10 ring-1 ring-indigo-500/30` (subtle glow). Status dot (6px, colored). Filename truncated in slate-200. TimeAgo in slate-500 text-xs. Click navigates.

`UploadArea.tsx` — Centered in content pane. Glass card (`bg-white/5 backdrop-blur-md rounded-xl border border-white/10`). Drag-and-drop + click. Gradient border animation on drag: border becomes indigo-400→violet-400 gradient. Progress bar: indigo-500 on white/10 track.

`TranscriptView.tsx` — p-8 max-w-4xl. Back in indigo-400. Title in white. Status as colored text. Segments with [MM:SS] in slate-500 font-mono. Transcript in slate-200 leading-relaxed.

`WorkerList.tsx` — p-8. Glass cards for each worker (`bg-white/5 backdrop-blur-sm rounded-lg`). Status dots with glow (box-shadow). Refresh in indigo-400. No polling.

**Verify:** `npx tsc --noEmit` — no errors.
**Commit:** `git commit -m "feat: add version 3 (Indigo Night) — glass sidebar dark theme"`

---

### Task 4: Version 4 — Ember (Warm dark luxury)

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** Luxury car dashboard at night. Warm dark with amber/orange accents. Card grid layout. Cards lift on hover. Everything feels expensive and warm.

**Palette:**
- Background: `#0c0a09` (warm near-black, neutral-950)
- Surfaces: stone-900
- Primary: amber-500
- Secondary: orange-500
- Status: stone-400=pending, amber-500=processing, emerald-500=completed, rose-500=failed
- Text: stone-200 body, stone-400 muted, stone-100 headings

**Font:** "General Sans" from a CDN or fallback to "DM Sans" from Google Fonts

**Layout:** Centered max-w-5xl. Card grid — 2-column responsive grid for transcriptions. Upload as hero card spanning full width. Workers as horizontal scroll row of cards.

**Files:**
- Create: `frontend/src/versions/v4/App.tsx`
- Create: `frontend/src/versions/v4/UploadHero.tsx`
- Create: `frontend/src/versions/v4/JobGrid.tsx`
- Create: `frontend/src/versions/v4/JobCard.tsx`
- Create: `frontend/src/versions/v4/TranscriptView.tsx`
- Create: `frontend/src/versions/v4/WorkerRow.tsx`
- Modify: `frontend/src/main.tsx` — wire V4App

**Component details:**

`App.tsx` — Export as `V4App`. min-h-screen bg `#0c0a09` text-stone-200. max-w-5xl centered py-10 px-6. DM Sans/General Sans font. Title "Transcriber" in text-xs text-stone-500 uppercase tracking-widest. Pill tabs: stone-800 bg, active amber-500 text. Routes.

`UploadHero.tsx` — Full-width stone-900 rounded-2xl p-8 card. Warm shadow: `shadow-[0_4px_30px_rgba(245,158,11,0.08)]`. Drag-and-drop + click. Amber-500 gradient progress bar. On drag-over: amber border glow.

`JobCard.tsx` — stone-900 rounded-xl p-5. `hover:translate-y-[-2px] hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]` transition. Status as small dot with colored ring. Filename in stone-100 font-medium. TimeAgo in stone-500. Delete icon (stone-600 hover:stone-300).

`JobGrid.tsx` — `grid grid-cols-1 md:grid-cols-2 gap-4`. Uses useTranscriptions + useDeleteJob. Empty state in stone-500.

`WorkerRow.tsx` — Horizontal scroll: `flex gap-4 overflow-x-auto pb-2`. Each worker as a compact stone-900 rounded-xl card (min-w-[250px]). Status dot, label, heartbeat. Header with "Workers" + amber refresh button. No polling.

`TranscriptView.tsx` — Back in amber-500. Large stone-900 rounded-2xl card p-8 with warm shadow. Title in stone-100. Segments with [MM:SS] in font-mono text-stone-500. Text in stone-200 leading-relaxed.

**Verify:** `npx tsc --noEmit` — no errors.
**Commit:** `git commit -m "feat: add version 4 (Ember) — warm dark luxury theme"`

---

### Task 5: Version 5 — Abyss (Ultra-minimal dark)

> **REQUIRED SUB-SKILL:** Use `frontend-design` skill for this task.

**Design brief:** iA Writer dark mode. Almost no UI. Content-focused. Single cyan accent. The most minimal variant. Transcript detail is the star — beautiful dark reading experience.

**Palette:**
- Background: `#030712` (gray-950)
- Borders: gray-800
- Text: gray-200 body, gray-500 muted, gray-100 headings
- Single accent: cyan-400 (for links, active states)
- Everything else: monochromatic grays

**Font:** "Literata" from Google Fonts (editorial serif) for transcript text. System sans for UI text. The contrast between serif content and sans UI creates the editorial feel.

**Layout:** Narrow max-w-xl (even narrower than V1). No tabs — transcriptions are default view, "Workers" is a small link in the footer/header. Upload is just a "+" button. Job list is plain text lines. Almost zero UI chrome.

**Files:**
- Create: `frontend/src/versions/v5/App.tsx`
- Create: `frontend/src/versions/v5/UploadButton.tsx`
- Create: `frontend/src/versions/v5/JobList.tsx`
- Create: `frontend/src/versions/v5/TranscriptView.tsx`
- Create: `frontend/src/versions/v5/WorkerList.tsx`
- Modify: `frontend/src/main.tsx` — wire V5App, remove Placeholder

**Component details:**

`App.tsx` — Export as `V5App`. min-h-screen bg `#030712` text-gray-200. max-w-xl mx-auto py-16 px-6. Minimal header: "transcriber" in text-xs text-gray-600 tracking-widest. Nav: "transcriptions · workers" as tiny text links. "+" upload button on far right. Border-b border-gray-800 below header. Routes.

`UploadButton.tsx` — Just a "+" character in gray-500 hover:cyan-400. 24px, cursor-pointer. Hidden file input. During upload: replace with "uploading... 45%" in text-xs gray-500. Click only, no drag-and-drop.

`JobList.tsx` — Ultra-minimal. Each job: filename as a link (gray-300 hover:gray-100), then "(status)" in gray-600 text-xs. Delete as "×" in gray-700 hover:red-400. Space-y-1. Empty: "Nothing here yet." italic gray-600.

`WorkerList.tsx` — Prose lines. Each: "label — status, last seen Xm ago" in text-sm gray-400. "Refresh" as text-xs cyan-400 link. No polling.

`TranscriptView.tsx` — THE STAR. Literata font for transcript content. Back: "←" in gray-600 hover:gray-300. Title in text-lg font-medium gray-100 (sans). Status in text-xs gray-500. Transcript in Literata, text-lg leading-loose gray-300. Segments: [MM:SS] in text-xs gray-600 font-mono inline, then segment text in Literata serif. Gorgeous dark reading experience. Delete: "delete" in text-xs gray-700 hover:red-400 at bottom.

**After building, update main.tsx to remove Placeholder:**
```tsx
import { V5App } from "./versions/v5/App";
// Remove Placeholder, all 5 versions now have real components
<Route path="/5/*" element={<V5App />} />
```

**Verify:** `npx tsc --noEmit` — no errors.
**Commit:** `git commit -m "feat: add version 5 (Abyss) — ultra-minimal dark theme"`

---

### Task 6: Final verification and production build

**Step 1: Full TypeScript check**

```bash
cd /Users/mzn/dev/codex/transcriber/frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 2: Production build**

```bash
cd /Users/mzn/dev/codex/transcriber/frontend && npm run build
```

Expected: clean build.

**Step 3: Verify main.tsx is clean**

Ensure: no Placeholder references, all 5 VApp imports, all 5 routes, Landing page at /.

**Step 4: Commit if any changes needed**

```bash
git add frontend/
git commit -m "chore: finalize all 5 dark mode iterations"
```
