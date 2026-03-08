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
- `PYANNOTE_AUTH_TOKEN` must be set for worker environments that need to download or load pyannote diarization models.
