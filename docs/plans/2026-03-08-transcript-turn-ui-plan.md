# Transcript Turn UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the empty/minimal transcript detail view with a structured speaker-turn UI and inline speaker renaming.

**Architecture:** The frontend will treat `speakers` and `turns` as the canonical transcript model. The transcript page will derive display state locally from those fields, call the existing speaker rename endpoint, and re-render all turns from the updated server response.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, existing FastAPI rename endpoint

---

### Task 1: Add Frontend Rename API Support

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/types/index.ts`
- Test: frontend build/typecheck

**Step 1: Write the failing type/API usage**

Add the request/response typing needed for renaming a speaker from the frontend.

**Step 2: Run build to verify missing API references fail**

Run:

```bash
cd frontend && npm run build
```

Expected:

- build fails once the transcript page starts calling a missing rename helper

**Step 3: Write minimal implementation**

Add a client helper:

- `renameSpeaker(transcriptionId, speakerKey, displayName)`

Reuse the existing response typing and error handling.

**Step 4: Run build to verify it passes**

Run:

```bash
cd frontend && npm run build
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/types/index.ts
git commit -m "feat: add frontend speaker rename api"
```

### Task 2: Build Turn-Based Transcript Layout

**Files:**
- Modify: `frontend/src/components/TranscriptView.tsx`
- Create or modify helper in: `frontend/src/utils/format.ts` or a new UI helper file if needed
- Test: frontend build/typecheck

**Step 1: Write the failing UI contract**

Change the transcript view implementation so it expects:

- `speakers`
- `turns`

and removes the old placeholder/minimal rendering.

**Step 2: Run build to verify it fails until all references are fixed**

Run:

```bash
cd frontend && npm run build
```

Expected:

- build failure while layout helpers or event handlers are incomplete

**Step 3: Write minimal implementation**

Render:

- timestamp column
- speaker label column
- text column

Use a responsive layout:

- grid/table-like on desktop
- stacked rows on mobile

Include stable per-speaker colors derived from `speaker_key`.

**Step 4: Run build to verify it passes**

Run:

```bash
cd frontend && npm run build
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add frontend/src/components/TranscriptView.tsx frontend/src/utils/format.ts
git commit -m "feat: render structured speaker turns"
```

### Task 3: Add Inline Speaker Renaming

**Files:**
- Modify: `frontend/src/components/TranscriptView.tsx`
- Test: frontend build/typecheck

**Step 1: Write the failing interaction**

Add state for:

- currently edited speaker
- draft value
- saving state
- inline error state

**Step 2: Run build to verify incomplete interaction code fails**

Run:

```bash
cd frontend && npm run build
```

Expected:

- build failure until rename state and handlers are wired correctly

**Step 3: Write minimal implementation**

Implement:

- click-to-edit speaker label
- `Enter` submit
- `Escape` cancel
- blur submit
- rename API call
- local state replacement from server response

**Step 4: Run build to verify it passes**

Run:

```bash
cd frontend && npm run build
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add frontend/src/components/TranscriptView.tsx
git commit -m "feat: support inline speaker renaming"
```

### Task 4: End-to-End Verification

**Files:**
- Verify: `frontend/src/components/TranscriptView.tsx`
- Verify: `frontend/src/api/client.ts`

**Step 1: Run final frontend verification**

Run:

```bash
cd frontend && npm run build
```

Expected:

- PASS

**Step 2: Manual smoke test**

Run:

```bash
docker compose up -d --build frontend api worker
```

Then verify:

- transcript page shows visible rows for `turns`
- speaker colors are stable per speaker
- clicking a speaker name enables inline editing
- renaming one speaker updates all of that speaker’s turns
- empty/pending/processing/failed states still render correctly

**Step 3: Commit**

```bash
git add frontend
git commit -m "feat: add interactive speaker turn transcript ui"
```
