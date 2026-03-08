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
