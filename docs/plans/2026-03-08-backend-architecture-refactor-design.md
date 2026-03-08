# Backend Architecture Refactor Design

**Date:** 2026-03-08

## Goal

Refactor the local-only transcription app from three separate Python packages (`api`, `worker`, `shared`) into a single backend codebase with clearer module boundaries, explicit database migrations, safer job lifecycle handling, and a schema that separates queue state from large transcription artifacts.

## Context

The current backend works, but the architecture is carrying unnecessary distributed-system shape for a local app:

- three Python packages are coupled through a catch-all `shared` package
- schema creation happens in API startup instead of through migrations
- worker correctness depends on the `workers.current_job_id` relationship
- queue metadata and large transcription payloads live in the same table
- deletion and recovery behavior are fragile under crashes and restarts

The frontend will remain in the same repository, but backend concerns should be consolidated under a single `backend/` project.

## Repository Structure

Target repository layout:

```text
backend/
  alembic/
  pyproject.toml
  src/
    api/
    infra/
    services/
    worker/
  tests/
frontend/
docs/
docker-compose.yml
```

Boundary rules:

- `src/api/`: FastAPI app factory, routes, HTTP request/response schemas
- `src/services/`: business logic for uploads, job orchestration, deletion, worker state projection
- `src/infra/`: settings, database models/session, Alembic integration, file storage, transcription engine adapter
- `src/worker/`: worker process entrypoint and lease renewal / polling loops

The frontend remains in `frontend/` and does not share runtime code with the backend.

## Architecture

The backend remains a two-process system:

- API process for file upload, listing, deletion, health, and worker UI endpoints
- Worker process for claiming jobs, transcribing media, renewing leases, and finalizing results

The difference is that both processes now depend on one shared internal backend codebase instead of three separately packaged projects. Shared logic should live in service and infra modules, not in route handlers or worker loops.

## Database Design

Recommended tables:

### `transcriptions`

User-facing record and lifecycle state.

Suggested fields:

- `id`
- `source_filename`
- `media_type`
- `status`
- `attempt_count`
- `error`
- `created_at`
- `updated_at`
- `completed_at`

### `transcription_artifacts`

Large or storage-oriented payloads that should not bloat the queue table.

Suggested fields:

- `transcription_id`
- `upload_path`
- `transcript_text`
- `segments_json`

### `job_leases`

Authoritative processing ownership and recovery state.

Suggested fields:

- `transcription_id`
- `worker_id`
- `leased_until`
- `heartbeat_at`
- `attempt`

This table is the correctness boundary for claiming, lease renewal, stale-job recovery, and retry behavior.

### `workers`

UI-facing worker visibility, not job correctness.

Suggested fields:

- `id`
- `label`
- `status`
- `started_at`
- `last_heartbeat`
- `current_transcription_id`
- `last_error`

This table supports the frontend worker view, but loss or drift in `workers` rows must not orphan jobs.

## Lifecycle Rules

Processing flow:

1. API stores upload metadata and creates a `transcriptions` row plus artifact record.
2. Worker acquires a lease for a pending transcription.
3. Worker updates heartbeat / lease expiry while processing.
4. On success, worker writes transcript artifacts, marks transcription completed, then clears the lease.
5. On failure, worker increments attempts and either requeues or marks failed.
6. On crash or stale lease expiry, recovery logic reclaims or fails the job based on attempt limits.

Deletion rules:

- deletion of a leased transcription must return a controlled conflict, or
- the system must support explicit cancellation and then finalize deletion after lease resolution

Local-only does not remove the need for crash-safe lifecycle handling. It just means the system can optimize for single-node simplicity instead of distributed deployment concerns.

## Error Handling

Required changes:

- `/health` must return a non-2xx status when the database is unavailable
- DB mutations must happen before file cleanup; file deletion only occurs after commit
- worker shutdown must preserve enough state for deterministic requeue or recovery
- deletion of in-flight jobs must return an explicit API-level error instead of surfacing a raw DB exception

## Migrations

Replace startup `create_all()` with Alembic-managed migrations.

Requirements:

- one migration history under `backend/alembic/`
- explicit baseline migration for new schema
- data migration path from current tables if preserving existing local data matters
- startup should validate schema availability, not mutate it implicitly

## Testing Strategy

Add a single backend test suite:

- `backend/tests/unit/` for service and lifecycle rules
- `backend/tests/integration/` for DB-backed API and worker behavior

Priority test coverage:

- claim and lease renewal
- stale lease recovery
- retry exhaustion
- deletion conflict during processing
- artifact cleanup after commit
- worker UI listing and stale worker state
- migration smoke tests

## Recommended Execution Order

1. Consolidate repository structure into a single backend package.
2. Introduce Alembic and baseline schema.
3. Move DB models and settings into `infra`.
4. Implement service-layer lifecycle rules.
5. Rebuild API and worker entrypoints on top of services.
6. Add tests for lifecycle and schema behavior.
7. Remove legacy package layout and startup schema creation.

## Decision Summary

Chosen direction:

- one repo with `backend/` and `frontend/`
- one backend Python project
- backend source layout:
  - `backend/src/api`
  - `backend/src/services`
  - `backend/src/infra`
  - `backend/src/worker`
- retain separate API and worker processes
- keep Postgres if desired, but model jobs around leases instead of worker-owned state
- keep a `workers` table for UI visibility only

