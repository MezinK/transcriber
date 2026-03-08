from collections.abc import Iterator
from dataclasses import dataclass
from datetime import timedelta
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
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from infra.models import MediaType, Transcription, WorkerStatus
from infra.time import utc_now
from services.workers import (
    clear_worker_current_job,
    list_workers,
    register_worker,
    set_worker_current_job,
)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
POSTGRES_IMAGE = "postgres:17"


@dataclass
class PostgresTestDatabase:
    database_url: str


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
    container_name = f"transcriber-workers-{uuid.uuid4().hex[:12]}"
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


@pytest.fixture
def postgres_database() -> Iterator[PostgresTestDatabase]:
    container_name: str | None = None
    database_name: str | None = None
    admin_url: str | None = None

    try:
        container_name, host_port = _start_postgres_container()
        admin_url = f"postgresql://app:app@127.0.0.1:{host_port}/postgres"
        _wait_for_postgres(admin_url)
        database_name = f"workers_test_{uuid.uuid4().hex}"
        _create_database(admin_url, database_name)
        database_url = f"postgresql+asyncpg://app:app@127.0.0.1:{host_port}/{database_name}"

        config = Config(str(ALEMBIC_INI))
        config.set_main_option(
            "sqlalchemy.url",
            f"postgresql+psycopg://app:app@127.0.0.1:{host_port}/{database_name}",
        )
        command.upgrade(config, "head")

        yield PostgresTestDatabase(database_url=database_url)
    finally:
        try:
            if admin_url is not None and database_name is not None:
                _drop_database(admin_url, database_name)
        finally:
            if container_name is not None:
                _stop_postgres_container(container_name)


@pytest_asyncio.fixture
async def session_factory(postgres_database: PostgresTestDatabase):
    engine = create_async_engine(postgres_database.database_url)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_set_worker_processing_and_clear_for_ui(session_factory):
    worker_id = uuid.uuid4()
    transcription_id = await _seed_transcription(session_factory)

    await register_worker(
        session_factory=session_factory,
        worker_id=worker_id,
        label="ui-worker",
    )
    assert await set_worker_current_job(
        session_factory=session_factory,
        worker_id=worker_id,
        transcription_id=transcription_id,
    )
    assert await clear_worker_current_job(
        session_factory=session_factory,
        worker_id=worker_id,
        last_error="last problem",
    )

    workers = await list_workers(session_factory=session_factory)

    assert len(workers) == 1
    assert workers[0].status == WorkerStatus.IDLE
    assert workers[0].current_transcription_id is None
    assert workers[0].last_error == "last problem"


@pytest.mark.asyncio
async def test_list_workers_marks_stale_from_heartbeat_age(session_factory):
    worker_id = uuid.uuid4()
    now = utc_now()
    await register_worker(
        session_factory=session_factory,
        worker_id=worker_id,
        label="stale-worker",
        now=lambda: now - timedelta(minutes=10),
    )

    workers = await list_workers(
        session_factory=session_factory,
        stale_after_seconds=60,
        now=lambda: now,
    )

    assert len(workers) == 1
    assert workers[0].status == WorkerStatus.STALE


async def _seed_transcription(session_factory) -> uuid.UUID:
    async with session_factory() as session:
        async with session.begin():
            transcription = Transcription(
                source_filename="worker.wav",
                media_type=MediaType.AUDIO,
            )
            session.add(transcription)
        return transcription.id
