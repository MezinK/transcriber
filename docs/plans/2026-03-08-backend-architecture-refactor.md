# Backend Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the backend into a single Python project with clearer module boundaries, Alembic migrations, lease-based job processing, a UI-facing workers table, and integration tests for lifecycle correctness.

**Architecture:** Keep the repo split into `backend/` and `frontend/`, but replace the current `api`/`worker`/`shared` Python packages with one backend project. Business rules move into `src/services`, persistence and adapters into `src/infra`, FastAPI into `src/api`, and worker runtime into `src/worker`. Database correctness is based on transcription state plus job leases, while `workers` is retained for observability only.

**Tech Stack:** Python 3.14, uv, FastAPI, SQLAlchemy async, Alembic, PostgreSQL 17, faster-whisper, pytest, Docker Compose

---

### Task 1: Create the backend project skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/src/api/__init__.py`
- Create: `backend/src/services/__init__.py`
- Create: `backend/src/infra/__init__.py`
- Create: `backend/src/worker/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/uv.lock`

**Step 1: Write the failing smoke check**

Run:

```bash
test -f backend/pyproject.toml
```

Expected: non-zero exit because the backend project does not exist yet.

**Step 2: Create `backend/pyproject.toml`**

Add one backend project with dependencies for API, worker, DB, migrations, and tests:

```toml
[project]
name = "backend"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = [
  "fastapi[standard]>=0.115",
  "uvicorn>=0.34",
  "python-multipart>=0.0.18",
  "aiofiles>=24.1",
  "sqlalchemy[asyncio]>=2.0",
  "asyncpg>=0.30",
  "pydantic>=2.0",
  "pydantic-settings>=2.0",
  "alembic>=1.14",
  "faster-whisper>=1.1",
]

[dependency-groups]
dev = [
  "pytest>=8.0",
  "pytest-asyncio>=0.25",
  "httpx>=0.28",
]
```

**Step 3: Create package directories**

Create:

```text
backend/src/api/__init__.py
backend/src/services/__init__.py
backend/src/infra/__init__.py
backend/src/worker/__init__.py
backend/tests/__init__.py
```

**Step 4: Keep runtime wiring unchanged for now**

Do not switch `docker-compose.yml` to the new backend build paths yet.

Reason:

- the backend skeleton is not executable at this stage
- changing Compose early creates a false integration signal
- runtime migration belongs with the later Docker and entrypoint migration task

**Step 5: Run sync**

Run:

```bash
cd backend && uv sync
```

Expected: dependencies install successfully.

Commit the generated `backend/uv.lock` so the new backend project has a reproducible dependency baseline.

**Step 6: Commit**

```bash
git add backend/pyproject.toml backend/src backend/tests backend/uv.lock
git commit -m "refactor: create unified backend project"
```

---

### Task 2: Move settings and database bootstrapping into `infra`

**Files:**
- Create: `backend/src/infra/config.py`
- Create: `backend/src/infra/db.py`
- Create: `backend/src/infra/time.py`
- Test: `backend/tests/unit/test_config.py`

**Step 1: Write the failing test**

```python
from infra.config import get_settings


def test_get_settings_reads_local_defaults():
    settings = get_settings()
    assert settings.upload_dir
    assert settings.database_url.startswith("postgresql+asyncpg://")
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend && uv run pytest tests/unit/test_config.py -v
```

Expected: import error because `infra.config` does not exist.

**Step 3: Write minimal implementation**

Create `backend/src/infra/config.py` with cached settings and `backend/src/infra/db.py` with engine/session factory. Include app settings such as:

- `database_url`
- `upload_dir`
- `max_upload_bytes`
- `lease_duration_seconds`
- `worker_poll_interval_seconds`
- `heartbeat_interval_seconds`

Add `backend/src/infra/time.py` if you need a single place for clock helpers in tests.

**Step 4: Run the test**

Run:

```bash
cd backend && uv run pytest tests/unit/test_config.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/infra/config.py backend/src/infra/db.py backend/src/infra/time.py backend/tests/unit/test_config.py
git commit -m "refactor: add backend infra config and db setup"
```

---

### Task 3: Introduce Alembic and baseline schema

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/<timestamp>_baseline_schema.py`
- Create: `backend/src/infra/models.py`
- Test: `backend/tests/integration/test_migrations.py`

**Step 1: Write the failing migration smoke test**

```python
def test_alembic_upgrade_head(applied_database):
    assert applied_database.current_revision == "head"
```

Use the project’s DB test fixture conventions when they exist.

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend && uv run pytest tests/integration/test_migrations.py -v
```

Expected: failure because Alembic and models are not configured.

**Step 3: Create SQLAlchemy models**

Define models for:

- `transcriptions`
- `transcription_artifacts`
- `job_leases`
- `workers`

Model requirements:

- `transcriptions` contains lifecycle status and timestamps
- `transcription_artifacts` holds upload path, transcript text, and segment JSON
- `job_leases` contains `transcription_id`, `worker_id`, `leased_until`, `heartbeat_at`, `attempt`
- `workers` is observational and may include `current_transcription_id`

Add indexes that match query patterns:

- `transcriptions(status, created_at)`
- `transcriptions(created_at)`
- `workers(last_heartbeat)`
- `workers(started_at)`
- `job_leases(leased_until)`

**Step 4: Initialize Alembic**

Set up Alembic to target `infra.models.Base.metadata` and create a baseline migration.

**Step 5: Run migration smoke test**

Run:

```bash
cd backend && uv run pytest tests/integration/test_migrations.py -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/alembic.ini backend/alembic backend/src/infra/models.py backend/tests/integration/test_migrations.py
git commit -m "refactor: add alembic and baseline backend schema"
```

---

### Task 4: Implement storage service and artifact separation

**Files:**
- Create: `backend/src/services/storage.py`
- Create: `backend/src/services/uploads.py`
- Test: `backend/tests/unit/test_uploads.py`

**Step 1: Write the failing tests**

Add tests for:

- filename sanitization
- file extension validation
- upload streaming with max size enforcement
- cleanup of partial files on failure

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/unit/test_uploads.py -v
```

Expected: failures because upload services do not exist.

**Step 3: Write minimal implementation**

Create:

- `storage.py` for filesystem read/write/delete helpers
- `uploads.py` for upload orchestration that creates `transcriptions` and `transcription_artifacts` records

Implementation rules:

- upload file first
- create DB rows inside transaction
- if DB write fails, clean up orphan file
- do not store large transcript payloads in the `transcriptions` row

**Step 4: Run tests**

Run:

```bash
cd backend && uv run pytest tests/unit/test_uploads.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/storage.py backend/src/services/uploads.py backend/tests/unit/test_uploads.py
git commit -m "refactor: add upload and storage services"
```

---

### Task 5: Implement lease-based job lifecycle service

**Files:**
- Create: `backend/src/services/jobs.py`
- Test: `backend/tests/unit/test_jobs.py`
- Test: `backend/tests/integration/test_job_lifecycle.py`

**Step 1: Write the failing unit tests**

Cover:

- claim next pending transcription
- reject claim when active lease exists
- renew lease heartbeat
- mark success and write artifacts
- retry transient failures
- mark permanent failure after max attempts

**Step 2: Write the failing integration tests**

Cover:

- stale lease recovery
- no duplicate claims across two workers
- file cleanup only after commit

**Step 3: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/unit/test_jobs.py tests/integration/test_job_lifecycle.py -v
```

Expected: failures because `services.jobs` does not exist.

**Step 4: Write minimal implementation**

Create a service API similar to:

```python
async def claim_next_transcription(...)
async def renew_lease(...)
async def complete_transcription(...)
async def fail_transcription(...)
async def recover_stale_leases(...)
```

Rules:

- `job_leases` is authoritative for processing ownership
- `workers` can be updated for UI visibility, but job correctness must not depend on it
- cleanup of uploaded files happens only after commit succeeds
- deletion conflicts must be detectable at service level

**Step 5: Run tests**

Run:

```bash
cd backend && uv run pytest tests/unit/test_jobs.py tests/integration/test_job_lifecycle.py -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/src/services/jobs.py backend/tests/unit/test_jobs.py backend/tests/integration/test_job_lifecycle.py
git commit -m "refactor: add lease-based job lifecycle service"
```

---

### Task 6: Implement worker visibility service for the UI

**Files:**
- Create: `backend/src/services/workers.py`
- Test: `backend/tests/unit/test_workers.py`
- Test: `backend/tests/integration/test_worker_visibility.py`

**Step 1: Write the failing tests**

Cover:

- register worker for UI
- set worker processing state
- mark worker idle after completion
- mark worker stale based on heartbeat age
- list workers sorted for UI consumption

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/unit/test_workers.py tests/integration/test_worker_visibility.py -v
```

Expected: failures because worker service does not exist.

**Step 3: Write minimal implementation**

Create service functions such as:

```python
async def register_worker(...)
async def heartbeat_worker(...)
async def set_worker_current_job(...)
async def clear_worker_current_job(...)
async def list_workers(...)
```

Rules:

- worker rows support UI display only
- stale worker detection should not mutate job correctness directly
- services may expose derived UI status such as `idle`, `processing`, `stale`

**Step 4: Run tests**

Run:

```bash
cd backend && uv run pytest tests/unit/test_workers.py tests/integration/test_worker_visibility.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/services/workers.py backend/tests/unit/test_workers.py backend/tests/integration/test_worker_visibility.py
git commit -m "refactor: add worker visibility service"
```

---

### Task 7: Rebuild the API on top of services

**Files:**
- Create: `backend/src/api/main.py`
- Create: `backend/src/api/routes/transcriptions.py`
- Create: `backend/src/api/routes/workers.py`
- Create: `backend/src/api/schemas.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`
- Test: `backend/tests/integration/test_api_workers.py`

**Step 1: Write the failing integration tests**

Cover:

- upload creates transcription and artifact record
- list and fetch transcriptions
- delete returns `409` while leased
- worker list endpoint returns UI rows
- `/health` returns non-200 on DB failure

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/integration/test_api_transcriptions.py tests/integration/test_api_workers.py -v
```

Expected: failures because API modules do not exist.

**Step 3: Write minimal implementation**

Create:

- FastAPI app factory
- transcription routes backed by `services.uploads` and `services.jobs`
- worker routes backed by `services.workers`
- API schemas separated from SQLAlchemy models

Implementation rules:

- `/health` returns a failure status code when DB access fails
- delete returns `409` for leased/in-progress jobs
- routes do not embed business logic directly

**Step 4: Run tests**

Run:

```bash
cd backend && uv run pytest tests/integration/test_api_transcriptions.py tests/integration/test_api_workers.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/api backend/tests/integration/test_api_transcriptions.py backend/tests/integration/test_api_workers.py
git commit -m "refactor: rebuild api on service layer"
```

---

### Task 8: Rebuild the worker runtime on top of services

**Files:**
- Create: `backend/src/worker/main.py`
- Create: `backend/src/worker/engine.py`
- Test: `backend/tests/integration/test_worker_runtime.py`

**Step 1: Write the failing integration tests**

Cover:

- worker claims a pending job
- heartbeat renews lease during work
- completion writes results and clears lease
- failure requeues with incremented attempt count
- shutdown preserves recoverable state

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/integration/test_worker_runtime.py -v
```

Expected: failures because worker runtime modules do not exist.

**Step 3: Write minimal implementation**

Create:

- worker main loop that polls claim service
- periodic heartbeat / stale recovery loop
- transcription engine adapter wrapper

Rules:

- use service-layer functions for all job state changes
- do not clear in-memory job state until DB finalization succeeds
- shutdown path must leave the system recoverable

**Step 4: Run tests**

Run:

```bash
cd backend && uv run pytest tests/integration/test_worker_runtime.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/worker backend/tests/integration/test_worker_runtime.py
git commit -m "refactor: rebuild worker runtime on service layer"
```

---

### Task 9: Migrate Docker and runtime commands to the new backend layout

**Files:**
- Create: `backend/Dockerfile`
- Modify: `docker-compose.yml`
- Test: `backend/tests/integration/test_container_commands.md`

**Step 1: Write the expected command list**

Create a lightweight verification note or test fixture documenting the expected commands:

- API command imports `api.main`
- worker command imports `worker.main`
- both run from `backend/`

**Step 2: Run a failing container build**

Run:

```bash
docker compose build api worker
```

Expected: failure until Dockerfiles and paths are updated.

**Step 3: Update runtime config**

Move build contexts and commands so containers run the new backend package layout only.

**Step 4: Run container build again**

Run:

```bash
docker compose build api worker
```

Expected: success.

**Step 5: Commit**

```bash
git add backend/Dockerfile docker-compose.yml backend/tests/integration/test_container_commands.md
git commit -m "refactor: update containers for unified backend"
```

---

### Task 10: Remove the legacy package layout and add compatibility notes

**Files:**
- Delete: `api/`
- Delete: `worker/`
- Delete: `shared/`
- Modify: `docs/plans/2026-03-08-backend-architecture-refactor-design.md`
- Modify: `README` or backend docs if present
- Test: `backend/tests/integration/test_import_smoke.py`

**Step 1: Write the failing import smoke test**

Check that imports resolve only from the new backend project.

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend && uv run pytest tests/integration/test_import_smoke.py -v
```

Expected: failure until old imports are removed and new imports are in place.

**Step 3: Remove legacy code**

Delete old package directories only after:

- migrations are in place
- API and worker entrypoints are green
- tests cover job lifecycle and deletion behavior

**Step 4: Run full backend suite**

Run:

```bash
cd backend && uv run pytest -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy backend package layout"
```

---

### Task 11: Verify the full local stack

**Files:**
- Modify: `docs/plans/2026-03-08-backend-architecture-refactor.md`

**Step 1: Start the stack**

Run:

```bash
docker compose up --build -d
```

Expected: API, Postgres, and worker containers start successfully.

**Step 2: Run manual smoke checks**

Run:

```bash
curl -f http://localhost:8000/health
curl -F "file=@audio.webm" http://localhost:8000/transcriptions/
curl http://localhost:8000/transcriptions/
curl http://localhost:8000/workers/
```

Expected:

- health returns success JSON
- upload returns `201`
- transcription eventually reaches completed or failed deterministically
- workers endpoint returns active worker info for the UI

**Step 3: Record follow-up issues**

Update the plan doc with any gaps found during the smoke test.

**Step 4: Commit**

```bash
git add docs/plans/2026-03-08-backend-architecture-refactor.md
git commit -m "docs: record backend refactor verification notes"
```
