# Transcription App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully containerized transcription backend with a FastAPI API, Postgres DB, and polling workers using faster-whisper.

**Architecture:** Three separate uv projects (shared, api, worker) in a monorepo. The API accepts file uploads and creates DB jobs. Workers poll Postgres using `SELECT ... FOR UPDATE SKIP LOCKED` to claim jobs, transcribe with faster-whisper, and write results back. Everything runs via Docker Compose.

**Tech Stack:** Python 3.14 (mise), uv, FastAPI, SQLAlchemy (async), PostgreSQL 17, faster-whisper, Docker Compose, OrbStack (macOS)

---

### Task 1: Initialize repository and shared project

**Files:**
- Create: `shared/pyproject.toml`
- Create: `shared/src/shared/__init__.py`
- Create: `shared/src/shared/config.py`
- Create: `.python-version`
- Create: `.gitignore`

**Step 1: Create .python-version for mise**

```
3.14
```

**Step 2: Create .gitignore**

```gitignore
__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/
*.egg
.env
uploads/
```

**Step 3: Initialize shared uv project**

Run: `cd shared && uv init --lib --name shared`

Then replace the generated `pyproject.toml` with:

```toml
[project]
name = "shared"
version = "0.1.0"
description = "Shared models, schemas, and config for transcription app"
requires-python = ">=3.14"
dependencies = [
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg>=0.30",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 4: Create shared/src/shared/__init__.py**

```python
"""Shared library for the transcription app."""
```

**Step 5: Create shared/src/shared/config.py**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"

    model_config = {"env_prefix": ""}


settings = Settings()
```

**Step 6: Install dependencies**

Run: `cd shared && uv sync`

**Step 7: Commit**

```bash
git add .gitignore .python-version shared/
git commit -m "feat: initialize shared project with config"
```

---

### Task 2: Shared DB models and schemas

**Files:**
- Create: `shared/src/shared/db.py`
- Create: `shared/src/shared/models.py`
- Create: `shared/src/shared/schemas.py`

**Step 1: Create shared/src/shared/db.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from shared.config import settings

engine = create_async_engine(settings.database_url)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

**Step 2: Create shared/src/shared/models.py**

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TranscriptionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MediaType(str, enum.Enum):
    AUDIO = "audio"
    VIDEO = "video"


class Transcription(Base):
    __tablename__ = "transcriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    status: Mapped[TranscriptionStatus] = mapped_column(
        Enum(TranscriptionStatus, name="transcription_status"),
        default=TranscriptionStatus.PENDING,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type"), nullable=False
    )
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    last_heartbeat: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    current_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transcriptions.id"),
        nullable=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    current_job: Mapped[Transcription | None] = relationship(
        "Transcription", foreign_keys=[current_job_id]
    )
```

**Step 3: Create shared/src/shared/schemas.py**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel

from shared.models import MediaType, TranscriptionStatus


class TranscriptionCreate(BaseModel):
    """Internal schema — not used as request body (upload is multipart)."""
    file_path: str
    file_name: str
    media_type: MediaType


class TranscriptionResponse(BaseModel):
    id: uuid.UUID
    status: TranscriptionStatus
    file_name: str
    media_type: MediaType
    result_text: str | None = None
    result_json: dict | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TranscriptionListResponse(BaseModel):
    items: list[TranscriptionResponse]
    total: int
```

**Step 4: Verify shared package imports**

Run: `cd shared && uv run python -c "from shared.models import Transcription, Worker, TranscriptionStatus, MediaType; from shared.schemas import TranscriptionResponse; from shared.config import settings; print('OK')"`

Expected: `OK`

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add shared DB models, schemas, and session factory"
```

---

### Task 3: Initialize API project with FastAPI

**Files:**
- Create: `api/pyproject.toml`
- Create: `api/src/api/__init__.py`
- Create: `api/src/api/main.py`
- Create: `api/src/api/routes/__init__.py`
- Create: `api/src/api/routes/transcriptions.py`

**Step 1: Initialize api uv project**

Run: `cd api && uv init --lib --name api`

Then replace the generated `pyproject.toml` with:

```toml
[project]
name = "api"
version = "0.1.0"
description = "FastAPI HTTP backend for transcription app"
requires-python = ">=3.14"
dependencies = [
    "fastapi[standard]>=0.115",
    "uvicorn>=0.34",
    "python-multipart>=0.0.18",
    "shared",
]

[tool.uv.sources]
shared = { path = "../shared", editable = true }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 2: Create api/src/api/__init__.py**

```python
"""FastAPI backend for the transcription app."""
```

**Step 3: Create api/src/api/main.py**

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.db import engine
from shared.models import Base

from api.routes.transcriptions import router as transcriptions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Transcription API", lifespan=lifespan)
app.include_router(transcriptions_router, prefix="/transcriptions", tags=["transcriptions"])


@app.get("/health")
async def health():
    return {"status": "ok"}
```

**Step 4: Create api/src/api/routes/__init__.py**

```python
```

**Step 5: Create api/src/api/routes/transcriptions.py**

```python
import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from shared.config import settings
from shared.db import async_session
from shared.models import MediaType, Transcription, TranscriptionStatus
from shared.schemas import TranscriptionListResponse, TranscriptionResponse

router = APIRouter()

AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".wma", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS


def _get_media_type(filename: str) -> MediaType:
    ext = Path(filename).suffix.lower()
    if ext in AUDIO_EXTENSIONS:
        return MediaType.AUDIO
    if ext in VIDEO_EXTENSIONS:
        return MediaType.VIDEO
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file type: {ext}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
    )


@router.post("/", response_model=TranscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_transcription(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    media_type = _get_media_type(file.filename)

    file_id = uuid.uuid4()
    ext = Path(file.filename).suffix
    stored_name = f"{file_id}{ext}"
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    contents = await file.read()
    file_path.write_bytes(contents)

    transcription = Transcription(
        file_path=str(file_path),
        file_name=file.filename,
        media_type=media_type,
    )

    async with async_session() as session:
        session.add(transcription)
        await session.commit()
        await session.refresh(transcription)

    return transcription


@router.get("/", response_model=TranscriptionListResponse)
async def list_transcriptions(
    status_filter: TranscriptionStatus | None = Query(None, alias="status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    async with async_session() as session:
        query = select(Transcription).order_by(Transcription.created_at.desc())
        count_query = select(func.count(Transcription.id))

        if status_filter:
            query = query.where(Transcription.status == status_filter)
            count_query = count_query.where(Transcription.status == status_filter)

        total = (await session.execute(count_query)).scalar_one()
        result = await session.execute(query.offset(offset).limit(limit))
        items = result.scalars().all()

    return TranscriptionListResponse(items=items, total=total)


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: uuid.UUID):
    async with async_session() as session:
        transcription = await session.get(Transcription, transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        return transcription
```

**Step 6: Install dependencies and verify imports**

Run: `cd api && uv sync && uv run python -c "from api.main import app; print('OK')"`

Expected: `OK`

**Step 7: Commit**

```bash
git add api/
git commit -m "feat: add FastAPI API project with transcription endpoints"
```

---

### Task 4: Initialize worker project with consumer and engine abstraction

**Files:**
- Create: `worker/pyproject.toml`
- Create: `worker/src/worker/__init__.py`
- Create: `worker/src/worker/main.py`
- Create: `worker/src/worker/consumer.py`
- Create: `worker/src/worker/transcriber.py`
- Create: `worker/src/worker/engines/__init__.py`
- Create: `worker/src/worker/engines/faster_whisper.py`

**Step 1: Initialize worker uv project**

Run: `cd worker && uv init --lib --name worker`

Then replace the generated `pyproject.toml` with:

```toml
[project]
name = "worker"
version = "0.1.0"
description = "Transcription worker/consumer"
requires-python = ">=3.14"
dependencies = [
    "faster-whisper>=1.1",
    "shared",
]

[tool.uv.sources]
shared = { path = "../shared", editable = true }

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

**Step 2: Create worker/src/worker/__init__.py**

```python
"""Transcription worker."""
```

**Step 3: Create worker/src/worker/transcriber.py — engine interface**

```python
from dataclasses import dataclass
from typing import Protocol


@dataclass
class TranscriptionResult:
    text: str
    segments: list[dict]


class TranscriptionEngine(Protocol):
    def transcribe(self, file_path: str) -> TranscriptionResult: ...
```

**Step 4: Create worker/src/worker/engines/__init__.py**

```python
import os

from worker.transcriber import TranscriptionEngine


def get_engine() -> TranscriptionEngine:
    engine_name = os.environ.get("TRANSCRIPTION_ENGINE", "faster-whisper")

    if engine_name == "faster-whisper":
        from worker.engines.faster_whisper import FasterWhisperEngine
        model_size = os.environ.get("WHISPER_MODEL", "base")
        return FasterWhisperEngine(model_size=model_size)
    else:
        raise ValueError(f"Unknown transcription engine: {engine_name}")
```

**Step 5: Create worker/src/worker/engines/faster_whisper.py**

```python
from faster_whisper import WhisperModel

from worker.transcriber import TranscriptionEngine, TranscriptionResult


class FasterWhisperEngine(TranscriptionEngine):
    def __init__(self, model_size: str = "base", device: str = "cpu", compute_type: str = "int8"):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, file_path: str) -> TranscriptionResult:
        segments_gen, info = self.model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
        )

        segments = []
        full_text_parts = []

        for segment in segments_gen:
            words = []
            if segment.words:
                words = [
                    {
                        "word": w.word,
                        "start": w.start,
                        "end": w.end,
                        "probability": w.probability,
                    }
                    for w in segment.words
                ]

            segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "words": words,
                "avg_logprob": segment.avg_logprob,
                "no_speech_prob": segment.no_speech_prob,
            })
            full_text_parts.append(segment.text.strip())

        return TranscriptionResult(
            text=" ".join(full_text_parts),
            segments=segments,
        )
```

**Step 6: Create worker/src/worker/consumer.py**

```python
import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from shared.db import async_session
from shared.models import Transcription, TranscriptionStatus, Worker

logger = logging.getLogger(__name__)

HEARTBEAT_STALE_THRESHOLD = timedelta(minutes=2)


async def register_worker(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        worker = Worker(id=worker_id)
        session.add(worker)
        await session.commit()
    logger.info("Worker %s registered", worker_id)


async def try_claim_job(worker_id: uuid.UUID) -> Transcription | None:
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Transcription)
                .where(Transcription.status == TranscriptionStatus.PENDING)
                .order_by(Transcription.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            transcription = result.scalar_one_or_none()

            if transcription is None:
                return None

            transcription.status = TranscriptionStatus.PROCESSING

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(
                    current_job_id=transcription.id,
                    last_heartbeat=datetime.now(UTC),
                )
            )

    logger.info("Worker %s claimed job %s", worker_id, transcription.id)
    return transcription


async def complete_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    result_text: str,
    result_json: dict,
) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Transcription)
                .where(Transcription.id == transcription_id)
                .values(
                    status=TranscriptionStatus.COMPLETED,
                    result_text=result_text,
                    result_json=result_json,
                    completed_at=datetime.now(UTC),
                )
            )
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s completed", transcription_id)


async def fail_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    error: str,
) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Transcription)
                .where(Transcription.id == transcription_id)
                .values(
                    status=TranscriptionStatus.FAILED,
                    error=error,
                    completed_at=datetime.now(UTC),
                )
            )
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s failed: %s", transcription_id, error)


async def send_heartbeat(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(last_heartbeat=datetime.now(UTC))
            )


async def run_reaper() -> None:
    stale_cutoff = datetime.now(UTC) - HEARTBEAT_STALE_THRESHOLD

    async with async_session() as session:
        async with session.begin():
            # Find stale workers with assigned jobs
            result = await session.execute(
                select(Worker)
                .where(
                    Worker.last_heartbeat < stale_cutoff,
                    Worker.current_job_id.isnot(None),
                )
            )
            stale_workers = result.scalars().all()

            for worker in stale_workers:
                logger.warning(
                    "Reaping stale worker %s, resetting job %s",
                    worker.id,
                    worker.current_job_id,
                )
                await session.execute(
                    update(Transcription)
                    .where(Transcription.id == worker.current_job_id)
                    .values(status=TranscriptionStatus.PENDING)
                )
                await session.execute(
                    update(Worker)
                    .where(Worker.id == worker.id)
                    .values(current_job_id=None)
                )
```

**Step 7: Create worker/src/worker/main.py**

```python
import asyncio
import logging
import uuid

from worker.consumer import (
    complete_job,
    fail_job,
    register_worker,
    run_reaper,
    send_heartbeat,
    try_claim_job,
)
from worker.engines import get_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

POLL_INTERVAL = 2.0
HEARTBEAT_INTERVAL = 30.0


async def heartbeat_loop(worker_id: uuid.UUID, stop_event: asyncio.Event):
    while not stop_event.is_set():
        try:
            await send_heartbeat(worker_id)
        except Exception:
            logger.exception("Heartbeat failed")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=HEARTBEAT_INTERVAL)
        except TimeoutError:
            pass


async def main():
    worker_id = uuid.uuid4()
    logger.info("Starting worker %s", worker_id)

    engine = get_engine()
    logger.info("Loaded transcription engine: %s", type(engine).__name__)

    await register_worker(worker_id)

    stop_heartbeat = asyncio.Event()
    heartbeat_task = asyncio.create_task(heartbeat_loop(worker_id, stop_heartbeat))

    try:
        while True:
            await run_reaper()

            transcription = await try_claim_job(worker_id)

            if transcription is None:
                await asyncio.sleep(POLL_INTERVAL)
                continue

            logger.info("Processing job %s: %s", transcription.id, transcription.file_name)

            try:
                result = engine.transcribe(transcription.file_path)
                await complete_job(
                    worker_id=worker_id,
                    transcription_id=transcription.id,
                    result_text=result.text,
                    result_json={"segments": result.segments},
                )
            except Exception as e:
                logger.exception("Transcription failed for job %s", transcription.id)
                await fail_job(
                    worker_id=worker_id,
                    transcription_id=transcription.id,
                    error=str(e),
                )
    except KeyboardInterrupt:
        logger.info("Shutting down worker %s", worker_id)
    finally:
        stop_heartbeat.set()
        await heartbeat_task


if __name__ == "__main__":
    asyncio.run(main())
```

**Step 8: Install dependencies and verify imports**

Run: `cd worker && uv sync && uv run python -c "from worker.transcriber import TranscriptionEngine, TranscriptionResult; from worker.consumer import try_claim_job; print('OK')"`

Expected: `OK`

**Step 9: Commit**

```bash
git add worker/
git commit -m "feat: add worker project with consumer, engine abstraction, and faster-whisper"
```

---

### Task 5: Docker Compose and Dockerfiles

**Files:**
- Create: `docker-compose.yml`
- Create: `api/Dockerfile`
- Create: `worker/Dockerfile`

**Step 1: Create api/Dockerfile**

```dockerfile
FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy shared dependency first
COPY shared/ /app/shared/

# Copy api project
COPY api/ /app/api/

WORKDIR /app/api
RUN uv sync --frozen

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Create worker/Dockerfile**

```dockerfile
FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy shared dependency first
COPY shared/ /app/shared/

# Copy worker project
COPY worker/ /app/worker/

WORKDIR /app/worker
RUN uv sync --frozen

CMD ["uv", "run", "python", "-m", "worker.main"]
```

**Step 3: Create docker-compose.yml**

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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d transcriptions"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: api/Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: "postgresql+asyncpg://app:app@postgres:5432/transcriptions"
      UPLOAD_DIR: /uploads
    volumes:
      - uploads:/uploads
    depends_on:
      postgres:
        condition: service_healthy

  worker:
    build:
      context: .
      dockerfile: worker/Dockerfile
    environment:
      DATABASE_URL: "postgresql+asyncpg://app:app@postgres:5432/transcriptions"
      UPLOAD_DIR: /uploads
      TRANSCRIPTION_ENGINE: faster-whisper
      WHISPER_MODEL: base
    volumes:
      - uploads:/uploads
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
  uploads:
```

**Step 4: Build and start the stack**

Run: `docker compose build`

Expected: All images build successfully.

Run: `docker compose up -d`

Expected: All three services start. Postgres healthy, API on port 8000, worker polling.

**Step 5: Verify health endpoint**

Run: `curl http://localhost:8000/health`

Expected: `{"status":"ok"}`

**Step 6: Commit**

```bash
git add docker-compose.yml api/Dockerfile worker/Dockerfile
git commit -m "feat: add Dockerfiles and docker-compose for full local stack"
```

---

### Task 6: End-to-end smoke test

**Step 1: Ensure the stack is running**

Run: `docker compose up -d`

**Step 2: Upload an audio file**

Run: `curl -X POST http://localhost:8000/transcriptions/ -F "file=@test.mp3"`

(Use any short .mp3 file. If you don't have one, generate a small one with `ffmpeg -f lavfi -i "sine=frequency=440:duration=3" test.mp3`)

Expected: `201` response with `id`, `status: "pending"`, `media_type: "audio"`.

**Step 3: Check job status**

Run: `curl http://localhost:8000/transcriptions/{id}` (use the id from step 2)

Expected: Status should transition from `pending` → `processing` → `completed` (check worker logs with `docker compose logs worker -f`). Once completed, `result_text` and `result_json` should be populated.

**Step 4: List transcriptions**

Run: `curl "http://localhost:8000/transcriptions/?status=completed"`

Expected: Returns the completed transcription in the items list.

**Step 5: Check worker scaling**

Run: `docker compose up -d --scale worker=3`

Expected: Three worker containers running, each with a unique worker ID in the logs.

**Step 6: Commit any fixes from smoke testing**

```bash
git add -u
git commit -m "fix: adjustments from end-to-end smoke testing"
```
