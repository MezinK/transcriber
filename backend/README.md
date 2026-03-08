# Backend

Unified backend project for the local transcription tool.

## Commands

- Install API and migration dependencies: `uv sync`
- Install worker dependencies, including WhisperX: `uv sync --extra worker`
- Run migrations: `uv run alembic upgrade head`
- Start API: `uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`
- Start worker: `uv run python -m worker.main`
- Run tests: `uv run pytest -v`

## Defaults

- Local uploads default to `backend/var/uploads`.
- Docker Compose overrides `UPLOAD_DIR` to `/uploads` inside the containers.
- Worker defaults to `TRANSCRIPTION_BACKEND=whisperx`, `WHISPER_MODEL=base`, `WHISPER_DEVICE=cpu`, `WHISPER_COMPUTE_TYPE=int8`, and `WHISPER_BATCH_SIZE=4`.
- Diarization defaults to `WHISPER_DIARIZATION_ENABLED=false`.
- `HF_TOKEN` is required when WhisperX diarization is enabled, and that token must have accepted the Hugging Face model terms WhisperX depends on for diarization.
- Docker Compose runs the worker as `linux/amd64` so the current WhisperX stack stays on the most stable wheel path across hosts.

## WhisperX Planning Guardrail

- Verify WhisperX integration details against Context7 before changing backend runtime code.
- Do not rely on memory for the WhisperX Python API. Re-check Context7 before changing model loading, alignment, diarization, or speaker-assignment flow.
- Treat `docs/plans/2026-03-08-whisperx-context7-notes.md` as the checked-in summary of the current WhisperX Python flow and runtime caveats.

## Transcript Artifacts

- Completed transcriptions store raw ASR output in `segments_json`.
- Speaker labels are stored per transcription in `speakers_json`.
- Canonical display rows are stored in `turns_json` and split only when the speaker changes.
- Renaming a speaker updates only that transcription and does not require a separate stored transcript text blob.
