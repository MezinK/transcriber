# Transcription App Design

## Overview

A backend system for transcribing audio and video files. Two independently scalable components: an HTTP API that accepts uploads and creates jobs, and workers that claim and process those jobs. Fully containerized with Docker Compose (OrbStack on macOS).

## Project Structure

Three separate uv projects with a shared library:

```
transcriber/
├── docker-compose.yml
├── shared/                     # Shared library (uv project)
│   ├── pyproject.toml
│   └── src/shared/
│       ├── __init__.py
│       ├── db.py               # SQLAlchemy async engine, session factory
│       ├── models.py           # ORM models
│       ├── schemas.py          # Pydantic DTOs
│       └── config.py           # Settings via pydantic-settings
├── api/                        # FastAPI HTTP backend (uv project)
│   ├── pyproject.toml          # depends on shared (path dep)
│   ├── Dockerfile
│   └── src/api/
│       ├── __init__.py
│       ├── main.py             # FastAPI app, lifespan
│       └── routes/
│           └── transcriptions.py
├── worker/                     # Worker/consumer (uv project)
│   ├── pyproject.toml          # depends on shared (path dep)
│   ├── Dockerfile
│   └── src/worker/
│       ├── __init__.py
│       ├── main.py             # Poll loop entry point
│       ├── consumer.py         # Job claiming (FOR UPDATE SKIP LOCKED)
│       ├── transcriber.py      # Engine interface + registry
│       └── engines/
│           ├── __init__.py
│           ├── faster_whisper.py
│           └── vllm.py         # Future: vLLM HTTP client
└── uploads/                    # Shared volume for uploaded files
```

`shared` is a path dependency of both `api` and `worker`. Each project has its own `pyproject.toml` and Dockerfile. Python version managed via mise.

## Data Model

PostgreSQL with two tables.

### transcriptions

| Column       | Type                                       | Notes                          |
|--------------|--------------------------------------------|--------------------------------|
| id           | UUID                                       | PK, server-generated           |
| status       | ENUM('pending','processing','completed','failed') | Job state                |
| file_path    | TEXT                                       | Path to uploaded file          |
| file_name    | TEXT                                       | Original upload filename       |
| media_type   | ENUM('audio','video')                      | Type of uploaded media         |
| result_text  | TEXT, nullable                             | Plain text transcription       |
| result_json  | JSONB, nullable                            | Timestamped segments + metadata|
| error        | TEXT, nullable                             | Error message if failed        |
| created_at   | TIMESTAMP WITH TZ                          | Default now()                  |
| completed_at | TIMESTAMP WITH TZ, nullable               | When processing finished       |

### workers

| Column         | Type                        | Notes                          |
|----------------|-----------------------------|--------------------------------|
| id             | UUID                        | PK, self-assigned at startup   |
| last_heartbeat | TIMESTAMP WITH TZ           | Updated periodically           |
| current_job_id | UUID, nullable, FK          | References transcriptions.id   |
| started_at     | TIMESTAMP WITH TZ           | When worker came online        |

**Status transitions:**

```
pending -> processing -> completed
                     \-> failed
```

**Stale job recovery:** A reaper (running in each worker's poll loop) checks for workers with stale heartbeats (>2 minutes). If found, resets the associated transcription back to `pending` and clears the worker's `current_job_id`.

## API Endpoints

### POST /transcriptions

- Accepts `multipart/form-data` with media file
- Validates file type (audio/video by extension or MIME type)
- Saves file to shared `uploads/` volume
- Creates DB row with `status=pending`
- Returns 201 with transcription `id` and `status`

### GET /transcriptions

- Optional query param `?status=pending|processing|completed|failed`
- Paginated (offset/limit)
- Returns list of transcriptions

### GET /transcriptions/{id}

- Returns full transcription record
- Includes `result_text` and `result_json` when completed

## Worker Design

### Poll Loop

```
while True:
    run_reaper()          # check for stale workers, reset their jobs
    job = try_claim_job()
    if job:
        process(job)
    else:
        sleep(polling_interval)  # default: 2 seconds
```

### Job Claiming

```sql
BEGIN;
SELECT * FROM transcriptions
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE transcriptions
SET status = 'processing'
WHERE id = :claimed_id;

UPDATE workers
SET current_job_id = :claimed_id, last_heartbeat = now()
WHERE id = :worker_id;
COMMIT;
```

One job per worker at a time. Scale horizontally via `docker compose up --scale worker=N`.

### Heartbeat

Worker updates `workers.last_heartbeat` every ~30 seconds in a background thread while processing a job.

### Transcription Engine Abstraction

```python
class TranscriptionEngine(Protocol):
    def transcribe(self, file_path: str) -> TranscriptionResult: ...
```

Implementations:
- `FasterWhisperEngine` -- loads model in-process, default, works on CPU
- `VLLMEngine` -- future: HTTP client to vLLM server (potential Docker Model Runner + Metal on macOS)

Selected via environment variable (`TRANSCRIPTION_ENGINE=faster-whisper`). Default model: `base`.

## Output Formats

Two formats stored per transcription:
- `result_text`: Plain text transcription
- `result_json`: JSON with word-level timestamps, segments, and confidence scores

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_DB: transcriptions
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build: ./api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://app:app@postgres:5432/transcriptions
      UPLOAD_DIR: /uploads
    volumes:
      - uploads:/uploads
    depends_on:
      - postgres

  worker:
    build: ./worker
    environment:
      DATABASE_URL: postgresql+asyncpg://app:app@postgres:5432/transcriptions
      UPLOAD_DIR: /uploads
      TRANSCRIPTION_ENGINE: faster-whisper
      WHISPER_MODEL: base
    volumes:
      - uploads:/uploads
    depends_on:
      - postgres

volumes:
  pgdata:
  uploads:
```

- Postgres has no exposed ports (internal network only)
- API and worker share `uploads` volume
- Scale workers: `docker compose up --scale worker=3`
- Tested with OrbStack on macOS

## Technology Stack

- **Python** (version managed via mise)
- **uv** for project/dependency management
- **FastAPI** for HTTP API
- **SQLAlchemy** (async) for ORM
- **PostgreSQL 17** for database
- **faster-whisper** for transcription (default engine)
- **Docker Compose** for local orchestration
- **OrbStack** as Docker runtime on macOS

## No Auth

No authentication for now. Can be added later.
