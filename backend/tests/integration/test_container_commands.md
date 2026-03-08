# Expected Runtime Commands

- `migrate`: `uv run alembic upgrade head`
- `api`: `uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`
- `worker`: `uv run python -m worker.main`

All three commands run from `backend/`, using the unified backend project and imports from `src/api`, `src/services`, `src/infra`, and `src/worker`.
