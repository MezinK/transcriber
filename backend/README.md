# Backend

Unified backend project for the local transcription tool.

## Commands

- Install dependencies: `uv sync`
- Run migrations: `uv run alembic upgrade head`
- Start API: `uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`
- Start worker: `uv run python -m worker.main`
- Run tests: `uv run pytest -v`

## Defaults

- Local uploads default to `backend/var/uploads`.
- Docker Compose overrides `UPLOAD_DIR` to `/uploads` inside the containers.
- Worker diarization defaults to `DIARIZATION_ENGINE=pyannote` and `DIARIZATION_DEVICE=cpu`.
- `HF_TOKEN` is shared by diarization and `faster-whisper` model downloads.
- `HF_TOKEN` must be set when the worker needs to download or load pyannote diarization models, and that token must have accepted the `pyannote/speaker-diarization-community-1` model terms on Hugging Face.
- Docker Compose runs the backend services as `linux/amd64` so the pyannote dependency chain has compatible wheels on ARM hosts.

## WhisperX Planning Guardrail

- Verify WhisperX integration details against Context7 before changing backend runtime code.
- Do not rely on memory for the WhisperX Python API. Re-check Context7 before changing model loading, alignment, diarization, or speaker-assignment flow.
- Treat `docs/plans/2026-03-08-whisperx-context7-notes.md` as the checked-in summary of the current WhisperX Python flow and runtime caveats.

## Transcript Artifacts

- Completed transcriptions store raw ASR output in `segments_json`.
- Speaker labels are stored per transcription in `speakers_json`.
- Canonical display rows are stored in `turns_json` and split only when the speaker changes.
- Renaming a speaker updates only that transcription and does not require a separate stored transcript text blob.
