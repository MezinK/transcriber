from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
import subprocess
import time
import uuid

from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
import psycopg
from psycopg import sql
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.main import create_app
from infra.config import Settings
from infra.models import JobLease, MediaType, Transcription, TranscriptionArtifact
from infra.time import utc_now

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
    container_name = f"transcriber-api-{uuid.uuid4().hex[:12]}"
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
        database_name = f"api_test_{uuid.uuid4().hex}"
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


@pytest_asyncio.fixture
async def client(session_factory, tmp_path: Path):
    app = create_app(
        session_factory=session_factory,
        settings=Settings(
            database_url="postgresql+asyncpg://unused",
            upload_dir=str(tmp_path),
            max_upload_bytes=1024 * 1024,
            lease_duration_seconds=120,
            worker_poll_interval_seconds=2.0,
            heartbeat_interval_seconds=30.0,
        ),
    )
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as async_client:
        yield async_client


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


@pytest.mark.asyncio
async def test_upload_creates_transcription_and_artifact_record(
    client: AsyncClient,
    session_factory,
):
    response = await client.post(
        "/transcriptions/",
        files={"file": ("meeting.wav", b"payload", "audio/wav")},
    )

    assert response.status_code == 201
    payload = response.json()
    transcription_id = payload["id"]
    assert payload["source_filename"] == "meeting.wav"
    assert payload["status"] == "pending"

    async with session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        assert transcription is not None
        assert artifact is not None
        assert Path(artifact.upload_path).exists()


@pytest.mark.asyncio
async def test_list_and_fetch_transcriptions(
    client: AsyncClient,
    session_factory,
    tmp_path: Path,
):
    transcription_id, _ = await _seed_transcription(session_factory, tmp_path)

    list_response = await client.get("/transcriptions/")
    get_response = await client.get(f"/transcriptions/{transcription_id}")

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["id"] == str(transcription_id)
    assert get_response.status_code == 200
    assert get_response.json()["id"] == str(transcription_id)


@pytest.mark.asyncio
async def test_delete_returns_409_while_leased(
    client: AsyncClient,
    session_factory,
    tmp_path: Path,
):
    transcription_id, _ = await _seed_transcription(session_factory, tmp_path)

    async with session_factory() as session:
        async with session.begin():
            session.add(
                JobLease(
                    transcription_id=transcription_id,
                    worker_id=uuid.uuid4(),
                    leased_until=utc_now(),
                    heartbeat_at=utc_now(),
                    attempt=1,
                )
            )

    response = await client.delete(f"/transcriptions/{transcription_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Transcription is currently leased"


@pytest.mark.asyncio
async def test_health_returns_non_200_on_db_failure(tmp_path: Path):
    class BrokenSession:
        async def __aenter__(self):
            raise RuntimeError("database down")

        async def __aexit__(self, exc_type, exc, tb):
            return None

    app = create_app(
        session_factory=lambda: BrokenSession(),
        settings=Settings(
            database_url="postgresql+asyncpg://unused",
            upload_dir=str(tmp_path),
            max_upload_bytes=1024 * 1024,
            lease_duration_seconds=120,
            worker_poll_interval_seconds=2.0,
            heartbeat_interval_seconds=30.0,
        ),
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 503
    assert response.json()["detail"] == "database unreachable"
