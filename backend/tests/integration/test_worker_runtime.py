from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
import asyncio
import subprocess
import threading
import time
import uuid

from alembic import command
from alembic.config import Config
import psycopg
from psycopg import sql
import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from infra.models import (
    JobLease,
    MediaType,
    Transcription,
    TranscriptionArtifact,
    TranscriptionStatus,
    Worker,
    WorkerStatus,
)
from services.jobs import recover_stale_leases
from worker.engine import TranscriptionResult
from worker.main import WorkerRuntime

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
POSTGRES_IMAGE = "postgres:17"


@dataclass
class DatabaseHarness:
    session_factory: async_sessionmaker


def _run_command(*args: str) -> str:
    result = subprocess.run(
        args,
        cwd=BACKEND_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _start_postgres_container() -> tuple[str, int]:
    container_name = f"transcriber-runtime-{uuid.uuid4().hex[:12]}"
    _run_command(
        "docker",
        "run",
        "-d",
        "--rm",
        "-P",
        "--name",
        container_name,
        "-e",
        "POSTGRES_DB=postgres",
        "-e",
        "POSTGRES_USER=app",
        "-e",
        "POSTGRES_PASSWORD=app",
        POSTGRES_IMAGE,
    )
    port_mapping = _run_command("docker", "port", container_name, "5432/tcp")
    return container_name, int(port_mapping.rsplit(":", 1)[1])


def _stop_postgres_container(container_name: str) -> None:
    subprocess.run(
        ["docker", "rm", "-f", container_name],
        cwd=BACKEND_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def _wait_for_postgres(admin_url: str, timeout_seconds: float = 30.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with psycopg.connect(admin_url):
                return
        except psycopg.Error as exc:
            last_error = exc
            time.sleep(1)
    raise RuntimeError("PostgreSQL did not become ready in time") from last_error


def _create_database(admin_url: str, database_name: str) -> None:
    with psycopg.connect(admin_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
            )


def _drop_database(admin_url: str, database_name: str) -> None:
    with psycopg.connect(admin_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s AND pid <> pg_backend_pid()
                """,
                (database_name,),
            )
            cursor.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(
                    sql.Identifier(database_name)
                )
            )


@pytest_asyncio.fixture
async def database() -> Iterator[DatabaseHarness]:
    container_name: str | None = None
    database_name: str | None = None
    admin_url: str | None = None
    async_engine = None

    try:
        container_name, host_port = _start_postgres_container()
        admin_url = f"postgresql://app:app@127.0.0.1:{host_port}/postgres"
        _wait_for_postgres(admin_url)
        database_name = f"runtime_test_{uuid.uuid4().hex}"
        _create_database(admin_url, database_name)

        sync_database_url = (
            f"postgresql+psycopg://app:app@127.0.0.1:{host_port}/{database_name}"
        )
        async_database_url = (
            f"postgresql+asyncpg://app:app@127.0.0.1:{host_port}/{database_name}"
        )
        config = Config(str(ALEMBIC_INI))
        config.set_main_option("sqlalchemy.url", sync_database_url)
        command.upgrade(config, "head")

        async_engine = create_async_engine(
            async_database_url,
            pool_pre_ping=True,
            poolclass=NullPool,
        )
        yield DatabaseHarness(
            session_factory=async_sessionmaker(async_engine, expire_on_commit=False)
        )
    finally:
        if async_engine is not None:
            await async_engine.dispose()
        try:
            if admin_url is not None and database_name is not None:
                _drop_database(admin_url, database_name)
        finally:
            if container_name is not None:
                _stop_postgres_container(container_name)


async def _seed_transcription(session_factory, tmp_path: Path) -> tuple[uuid.UUID, Path]:
    upload_path = tmp_path / f"{uuid.uuid4()}.wav"
    upload_path.write_bytes(b"payload")

    async with session_factory() as session:
        async with session.begin():
            transcription = Transcription(
                source_filename="meeting.wav",
                media_type=MediaType.AUDIO,
            )
            artifact = TranscriptionArtifact(
                transcription=transcription,
                upload_path=str(upload_path),
            )
            session.add(transcription)
            session.add(artifact)
        return transcription.id, upload_path


async def _wait_for(predicate, timeout_seconds: float = 5.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        await asyncio.sleep(0.05)
    raise AssertionError("Timed out waiting for condition")


class SuccessfulEngine:
    def __init__(self, text: str = "done") -> None:
        self.text = text

    def transcribe(self, file_path: str) -> TranscriptionResult:
        return TranscriptionResult(
            text=self.text,
            segments=[{"text": self.text, "start": 0.0, "end": 1.0}],
        )


class FailingEngine:
    def transcribe(self, file_path: str) -> TranscriptionResult:
        raise RuntimeError("engine blew up")


class BlockingEngine:
    def __init__(self) -> None:
        self.started = threading.Event()
        self.release = threading.Event()

    def transcribe(self, file_path: str) -> TranscriptionResult:
        self.started.set()
        self.release.wait(timeout=10)
        return TranscriptionResult(
            text="blocked",
            segments=[{"text": "blocked", "start": 0.0, "end": 1.0}],
        )


@pytest.mark.asyncio
async def test_worker_claims_a_pending_job(database: DatabaseHarness, tmp_path: Path):
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    engine = BlockingEngine()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        engine=engine,
        heartbeat_interval_seconds=5.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        now_factory=lambda: datetime(2026, 3, 8, 16, 0, tzinfo=UTC),
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(engine.started.is_set)

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert transcription.status == TranscriptionStatus.PROCESSING
    assert lease is not None
    assert worker.status == WorkerStatus.PROCESSING
    assert worker.current_transcription_id == transcription_id

    engine.release.set()
    await task
    await runtime.close()


@pytest.mark.asyncio
async def test_heartbeat_renews_lease_during_work(
    database: DatabaseHarness,
    tmp_path: Path,
):
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    engine = BlockingEngine()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        engine=engine,
        heartbeat_interval_seconds=0.1,
        lease_duration_seconds=1,
        poll_interval_seconds=1.0,
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(engine.started.is_set)

    async with database.session_factory() as session:
        first_lease = await session.get(JobLease, transcription_id)
        first_expiry = first_lease.leased_until

    await asyncio.sleep(0.25)

    async with database.session_factory() as session:
        renewed_lease = await session.get(JobLease, transcription_id)

    assert renewed_lease.leased_until > first_expiry

    engine.release.set()
    await task
    await runtime.close()


@pytest.mark.asyncio
async def test_completion_writes_results_and_clears_lease(
    database: DatabaseHarness,
    tmp_path: Path,
):
    transcription_id, upload_path = await _seed_transcription(
        database.session_factory, tmp_path
    )
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        engine=SuccessfulEngine("final text"),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
    )

    processed = await runtime.run_once()

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert processed is True
    assert transcription.status == TranscriptionStatus.COMPLETED
    assert artifact.transcript_text == "final text"
    assert lease is None
    assert worker.status == WorkerStatus.IDLE
    assert upload_path.exists() is False
    await runtime.close()


@pytest.mark.asyncio
async def test_failure_requeues_with_incremented_attempt_count(
    database: DatabaseHarness,
    tmp_path: Path,
):
    transcription_id, upload_path = await _seed_transcription(
        database.session_factory, tmp_path
    )
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        engine=FailingEngine(),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        max_attempts=3,
    )

    processed = await runtime.run_once()

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)

    assert processed is True
    assert transcription.status == TranscriptionStatus.PENDING
    assert transcription.attempt_count == 1
    assert transcription.error == "Transcription failed: RuntimeError"
    assert lease is None
    assert upload_path.exists() is True
    await runtime.close()


@pytest.mark.asyncio
async def test_shutdown_preserves_recoverable_state(
    database: DatabaseHarness,
    tmp_path: Path,
):
    now = datetime(2026, 3, 8, 16, 30, tzinfo=UTC)
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    engine = BlockingEngine()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        engine=engine,
        heartbeat_interval_seconds=10.0,
        lease_duration_seconds=1,
        poll_interval_seconds=1.0,
        now_factory=lambda: now,
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(engine.started.is_set)
    assert runtime.current_claim is not None

    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    engine.release.set()
    await asyncio.sleep(0.1)

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert transcription.status == TranscriptionStatus.PROCESSING
    assert lease is not None
    assert worker.current_transcription_id == transcription_id

    summary = await recover_stale_leases(
        session_factory=database.session_factory,
        max_attempts=3,
        now_factory=lambda: now + timedelta(minutes=5),
    )

    async with database.session_factory() as session:
        recovered = await session.get(Transcription, transcription_id)
        recovered_lease = await session.get(JobLease, transcription_id)

    assert summary.requeued_ids == (transcription_id,)
    assert recovered.status == TranscriptionStatus.PENDING
    assert recovered_lease is None
    await runtime.close()
