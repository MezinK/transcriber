# Turn-Only Transcription Response Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove raw ASR artifacts from the default transcription API response and update the frontend to render only speaker turns.

**Architecture:** The backend keeps storing `segments_json` in `transcription_artifacts`, but the response serializer stops exposing it. The frontend adopts `speakers` and `turns` as the canonical transcript contract and removes all dependencies on `transcript_text` and `segments_json`.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, React, TypeScript, Vite

---

### Task 1: Trim Backend Transcription Responses

**Files:**
- Modify: `backend/src/api/schemas.py`
- Modify: `backend/src/api/routes/transcriptions.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`

**Step 1: Write the failing test**

Add or update an API test that fetches both the list and detail endpoints and asserts:

- `speakers` is present
- `turns` is present
- `segments_json` is absent from the JSON response
- `transcript_text` is absent from the JSON response

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend && uv run pytest -q tests/integration/test_api_transcriptions.py
```

Expected:

- at least one assertion fails because the old response shape still includes removed fields

**Step 3: Write minimal implementation**

Update the response schema and serializer so transcription responses no longer include:

- `segments_json`
- `transcript_text`

Keep:

- metadata
- `speakers`
- `turns`

Do not change database persistence.

**Step 4: Run test to verify it passes**

Run:

```bash
cd backend && uv run pytest -q tests/integration/test_api_transcriptions.py
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add backend/src/api/schemas.py backend/src/api/routes/transcriptions.py backend/tests/integration/test_api_transcriptions.py
git commit -m "feat: trim transcription api payload"
```

### Task 2: Update Frontend Types and Transcript View

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/TranscriptView.tsx`
- Modify: `frontend/src/api/client.ts` if response typing needs adjustment
- Test: frontend typecheck/build command

**Step 1: Write the failing type expectation**

Update the TypeScript model first so `Transcription` no longer contains:

- `transcript_text`
- `segments_json`

Add:

- `speakers`
- `turns`

This should immediately create compile errors in the current `TranscriptView`.

**Step 2: Run typecheck/build to verify it fails**

Run:

```bash
cd frontend && npm run build
```

Expected:

- TypeScript/build failure in `TranscriptView.tsx` because the old fields are still referenced

**Step 3: Write minimal implementation**

Update the transcript detail page to:

- build a lookup map from `speaker_key` to `display_name`
- render one row per turn
- show the turn start timestamp
- show the speaker display name
- show the turn text

Keep the existing pending/processing/failed banners.

For completed jobs with no turns, show a small empty-state message instead of raw segment fallback logic.

**Step 4: Run build to verify it passes**

Run:

```bash
cd frontend && npm run build
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/components/TranscriptView.tsx frontend/src/api/client.ts
git commit -m "feat: render speaker turns in transcript view"
```

### Task 3: Verify Full Contract End-to-End

**Files:**
- Verify: `backend/src/api/routes/transcriptions.py`
- Verify: `frontend/src/components/TranscriptView.tsx`
- Verify: `backend/src/services/transcript_assembly.py`

**Step 1: Run backend and frontend verification**

Run:

```bash
cd backend && uv run pytest -q tests/integration/test_api_transcriptions.py
cd ../frontend && npm run build
```

Expected:

- backend tests pass
- frontend build passes

**Step 2: Smoke test the UI**

Run:

```bash
docker compose up -d --build
```

Then:

- open the transcript detail page
- confirm completed jobs render speaker turns
- confirm failed/pending/processing states still render correctly
- inspect network responses and confirm `segments_json` is no longer included

**Step 3: Commit**

```bash
git add backend frontend
git commit -m "feat: adopt turn-only transcription responses"
```
