# Backend

Unified backend project for the local transcription tool.

## Commands

- Install dependencies: `uv sync`
- Run migrations: `uv run alembic upgrade head`
- Start API: `uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`
- Start worker: `uv run python -m worker.main`
- Run tests: `uv run pytest -v`
