from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
import subprocess
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
from services.jobs import (
    claim_next_transcription,
    complete_transcription,
    recover_stale_leases,
)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
POSTGRES_IMAGE = "postgres:17"


@dataclass
class DatabaseHarness:
    session_factory: async_sessionmaker
    async_engine: object


def _run_command(*args: str) -> str:
    result = subprocess.run(
        args,
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _start_postgres_container() -> tuple[str, int]:
    container_name = f"transcriber-jobs-{uuid.uuid4().hex[:12]}"
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
    host_port = int(port_mapping.rsplit(":", 1)[1])
    return container_name, host_port


def _stop_postgres_container(container_name: str) -> None:
    subprocess.run(
        ["docker", "rm", "-f", container_name],
        cwd=REPO_ROOT,
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

        database_name = f"jobs_test_{uuid.uuid4().hex}"
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
            session_factory=async_sessionmaker(async_engine, expire_on_commit=False),
            async_engine=async_engine,
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


async def _create_worker(
    session_factory: async_sessionmaker,
    *,
    worker_id: uuid.UUID,
    label: str,
) -> Worker:
    worker = Worker(id=worker_id, label=label)
    async with session_factory() as session:
        session.add(worker)
        await session.commit()
    return worker


async def _create_transcription(
    session_factory: async_sessionmaker,
    *,
    upload_path: str,
    status: TranscriptionStatus = TranscriptionStatus.PENDING,
    attempt_count: int = 0,
) -> Transcription:
    transcription = Transcription(
        source_filename=Path(upload_path).name,
        media_type=MediaType.AUDIO,
        status=status,
        attempt_count=attempt_count,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path=upload_path,
    )
    async with session_factory() as session:
        session.add(transcription)
        session.add(artifact)
        await session.commit()
    return transcription


async def _create_lease(
    session_factory: async_sessionmaker,
    *,
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
    leased_until: datetime,
    attempt: int,
) -> None:
    lease = JobLease(
        transcription_id=transcription_id,
        worker_id=worker_id,
        leased_until=leased_until,
        heartbeat_at=leased_until - timedelta(seconds=30),
        attempt=attempt,
    )
    async with session_factory() as session:
        session.add(lease)
        await session.commit()


class _SessionProxy:
    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)


class _FailingCommitSession(_SessionProxy):
    async def commit(self) -> None:
        raise RuntimeError("commit failed")


class _DelayedCommitSession(_SessionProxy):
    def __init__(self, session, *, entered_event: asyncio.Event, release_event: asyncio.Event):
        super().__init__(session)
        self._entered_event = entered_event
        self._release_event = release_event

    async def commit(self) -> None:
        self._entered_event.set()
        await self._release_event.wait()
        await self._session.commit()


class _ProxySessionFactory:
    def __init__(self, session_factory: async_sessionmaker, proxy_factory):
        self._session_factory = session_factory
        self._proxy_factory = proxy_factory

    def __call__(self):
        return _ProxySessionContext(self._session_factory, self._proxy_factory)


class _ProxySessionContext:
    def __init__(self, session_factory: async_sessionmaker, proxy_factory):
        self._session_factory = session_factory
        self._proxy_factory = proxy_factory
        self._context = None

    async def __aenter__(self):
        self._context = self._session_factory()
        session = await self._context.__aenter__()
        return self._proxy_factory(session)

    async def __aexit__(self, exc_type, exc, tb):
        return await self._context.__aexit__(exc_type, exc, tb)


@pytest.mark.asyncio
async def test_recover_stale_leases_requeues_or_fails_based_on_attempts(
    database: DatabaseHarness,
    tmp_path: Path,
):
    now = datetime(2026, 3, 8, 12, 0, tzinfo=UTC)
    worker_one = uuid.uuid4()
    worker_two = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_one, label="worker-1")
    await _create_worker(database.session_factory, worker_id=worker_two, label="worker-2")

    retry_file = tmp_path / "retry.wav"
    retry_file.write_bytes(b"retry")
    failed_file = tmp_path / "failed.wav"
    failed_file.write_bytes(b"failed")

    retry_transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(retry_file),
        status=TranscriptionStatus.PROCESSING,
        attempt_count=1,
    )
    failed_transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(failed_file),
        status=TranscriptionStatus.PROCESSING,
        attempt_count=2,
    )

    await _create_lease(
        database.session_factory,
        transcription_id=retry_transcription.id,
        worker_id=worker_one,
        leased_until=now - timedelta(minutes=1),
        attempt=1,
    )
    await _create_lease(
        database.session_factory,
        transcription_id=failed_transcription.id,
        worker_id=worker_two,
        leased_until=now - timedelta(minutes=1),
        attempt=2,
    )

    summary = await recover_stale_leases(
        session_factory=database.session_factory,
        max_attempts=2,
        now_factory=lambda: now,
    )

    assert summary.requeued_ids == (retry_transcription.id,)
    assert summary.failed_ids == (failed_transcription.id,)

    async with database.session_factory() as session:
        refreshed_retry = await session.get(Transcription, retry_transcription.id)
        refreshed_failed = await session.get(Transcription, failed_transcription.id)
        workers = (
            await session.execute(select(Worker).order_by(Worker.label))
        ).scalars().all()
        leases = (await session.execute(select(JobLease))).scalars().all()

    assert refreshed_retry.status == TranscriptionStatus.PENDING
    assert refreshed_retry.error == "Lease expired; job returned to queue"
    assert refreshed_failed.status == TranscriptionStatus.FAILED
    assert refreshed_failed.error == "Lease expired before transcription completed"
    assert leases == []
    assert [worker.status for worker in workers] == [WorkerStatus.STALE, WorkerStatus.STALE]
    assert all(worker.current_transcription_id is None for worker in workers)
    assert retry_file.exists() is True
    assert failed_file.exists() is False


@pytest.mark.asyncio
async def test_claim_next_transcription_does_not_duplicate_claims(
    database: DatabaseHarness,
    tmp_path: Path,
):
    worker_one = uuid.uuid4()
    worker_two = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_one, label="worker-1")
    await _create_worker(database.session_factory, worker_id=worker_two, label="worker-2")
    pending_file = tmp_path / "pending.wav"
    pending_file.write_bytes(b"pending")
    transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(pending_file),
    )

    entered_event = asyncio.Event()
    release_event = asyncio.Event()
    delayed_factory = _ProxySessionFactory(
        database.session_factory,
        lambda session: _DelayedCommitSession(
            session,
            entered_event=entered_event,
            release_event=release_event,
        ),
    )

    task_one = asyncio.create_task(
        claim_next_transcription(
            session_factory=delayed_factory,
            worker_id=worker_one,
            lease_duration_seconds=120,
            now_factory=lambda: datetime(2026, 3, 8, 12, 10, tzinfo=UTC),
        )
    )
    await asyncio.wait_for(entered_event.wait(), timeout=5)

    task_two_claim = await claim_next_transcription(
        session_factory=database.session_factory,
        worker_id=worker_two,
        lease_duration_seconds=120,
        now_factory=lambda: datetime(2026, 3, 8, 12, 10, tzinfo=UTC),
    )

    assert task_two_claim is None

    release_event.set()
    task_one_claim = await asyncio.wait_for(task_one, timeout=5)

    assert task_one_claim is not None
    assert task_one_claim.transcription_id == transcription.id

    async with database.session_factory() as session:
        leases = (await session.execute(select(JobLease))).scalars().all()
        workers = (
            await session.execute(select(Worker).order_by(Worker.label))
        ).scalars().all()
        refreshed = await session.get(Transcription, transcription.id)

    assert len(leases) == 1
    assert leases[0].worker_id == worker_one
    assert refreshed.status == TranscriptionStatus.PROCESSING
    assert [worker.status for worker in workers] == [
        WorkerStatus.PROCESSING,
        WorkerStatus.IDLE,
    ]


@pytest.mark.asyncio
async def test_complete_transcription_removes_upload_only_after_commit(
    database: DatabaseHarness,
    tmp_path: Path,
):
    worker_id = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_id, label="worker-1")
    upload_file = tmp_path / "complete.wav"
    upload_file.write_bytes(b"audio")
    transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(upload_file),
    )

    claimed = await claim_next_transcription(
        session_factory=database.session_factory,
        worker_id=worker_id,
        lease_duration_seconds=120,
        now_factory=lambda: datetime(2026, 3, 8, 12, 20, tzinfo=UTC),
    )
    assert claimed is not None
    assert claimed.transcription_id == transcription.id

    failing_factory = _ProxySessionFactory(
        database.session_factory,
        lambda session: _FailingCommitSession(session),
    )

    with pytest.raises(RuntimeError, match="commit failed"):
        await complete_transcription(
            session_factory=failing_factory,
            transcription_id=transcription.id,
            worker_id=worker_id,
            transcript_text="done",
            segments_json={"segments": [{"text": "done"}]},
            now_factory=lambda: datetime(2026, 3, 8, 12, 21, tzinfo=UTC),
        )

    assert upload_file.exists() is True

    async with database.session_factory() as session:
        failed_commit_transcription = await session.get(Transcription, transcription.id)
        failed_commit_artifact = await session.get(
            TranscriptionArtifact, transcription.id
        )
        failed_commit_lease = await session.get(JobLease, transcription.id)

    assert failed_commit_transcription.status == TranscriptionStatus.PROCESSING
    assert failed_commit_artifact.transcript_text is None
    assert failed_commit_lease is not None

    await complete_transcription(
        session_factory=database.session_factory,
        transcription_id=transcription.id,
        worker_id=worker_id,
        transcript_text="done",
        segments_json={"segments": [{"text": "done"}]},
        now_factory=lambda: datetime(2026, 3, 8, 12, 22, tzinfo=UTC),
    )

    async with database.session_factory() as session:
        completed_transcription = await session.get(Transcription, transcription.id)
        completed_artifact = await session.get(TranscriptionArtifact, transcription.id)
        completed_lease = await session.get(JobLease, transcription.id)
        completed_worker = await session.get(Worker, worker_id)

    assert completed_transcription.status == TranscriptionStatus.COMPLETED
    assert completed_artifact.transcript_text == "done"
    assert completed_lease is None
    assert completed_worker.status == WorkerStatus.IDLE
    assert upload_file.exists() is False
