from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
import subprocess
import time
import uuid

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
import psycopg
from psycopg import sql
import pytest
import sqlalchemy as sa
from sqlalchemy import create_engine, inspect

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"
POSTGRES_IMAGE = "postgres:17"


@dataclass
class AppliedDatabase:
    current_revision: str | None
    head_revision: str | None
    database_url: str


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
    container_name = f"transcriber-alembic-{uuid.uuid4().hex[:12]}"
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


@pytest.fixture
def applied_database() -> Iterator[AppliedDatabase]:
    container_name: str | None = None
    database_name: str | None = None
    admin_url: str | None = None
    try:
        container_name, host_port = _start_postgres_container()
        admin_url = f"postgresql://app:app@127.0.0.1:{host_port}/postgres"
        _wait_for_postgres(admin_url)

        database_name = f"alembic_test_{uuid.uuid4().hex}"
        _create_database(admin_url, database_name)
        database_url = (
            f"postgresql+psycopg://app:app@127.0.0.1:{host_port}/{database_name}"
        )

        config = Config(str(ALEMBIC_INI))
        config.set_main_option("sqlalchemy.url", database_url)
        script = ScriptDirectory.from_config(config)

        command.upgrade(config, "head")

        engine = create_engine(database_url)
        try:
            with engine.connect() as connection:
                current_revision = MigrationContext.configure(
                    connection
                ).get_current_revision()
        finally:
            engine.dispose()

        yield AppliedDatabase(
            current_revision=current_revision,
            head_revision=script.get_current_head(),
            database_url=database_url,
        )
    finally:
        try:
            if admin_url is not None and database_name is not None:
                _drop_database(admin_url, database_name)
        finally:
            if container_name is not None:
                _stop_postgres_container(container_name)


def test_alembic_upgrade_head(applied_database: AppliedDatabase):
    assert applied_database.current_revision == applied_database.head_revision

    engine = create_engine(applied_database.database_url)
    try:
        columns = {
            column["name"]
            for column in inspect(engine).get_columns("transcription_artifacts")
        }
    finally:
        engine.dispose()

    assert "speakers_json" in columns
    assert "turns_json" in columns
    assert "transcript_text" not in columns


def test_alembic_upgrade_backfills_existing_transcript_text():
    container_name: str | None = None
    database_name: str | None = None
    admin_url: str | None = None
    engine = None
    try:
        container_name, host_port = _start_postgres_container()
        admin_url = f"postgresql://app:app@127.0.0.1:{host_port}/postgres"
        _wait_for_postgres(admin_url)

        database_name = f"alembic_test_{uuid.uuid4().hex}"
        _create_database(admin_url, database_name)
        database_url = (
            f"postgresql+psycopg://app:app@127.0.0.1:{host_port}/{database_name}"
        )

        config = Config(str(ALEMBIC_INI))
        config.set_main_option("sqlalchemy.url", database_url)
        command.upgrade(config, "20260308_000001")

        transcription_id = uuid.uuid4()
        engine = create_engine(database_url)
        with engine.begin() as connection:
            connection.execute(
                sa.text(
                    """
                    INSERT INTO transcriptions (id, source_filename, media_type)
                    VALUES (:id, :source_filename, :media_type)
                    """
                ),
                {
                    "id": transcription_id,
                    "source_filename": "existing.wav",
                    "media_type": "audio",
                },
            )
            connection.execute(
                sa.text(
                    """
                    INSERT INTO transcription_artifacts (transcription_id, upload_path, transcript_text)
                    VALUES (:transcription_id, :upload_path, :transcript_text)
                    """
                ),
                {
                    "transcription_id": transcription_id,
                    "upload_path": "/tmp/existing.wav",
                    "transcript_text": "Existing transcript text.",
                },
            )

        command.upgrade(config, "head")

        with engine.connect() as connection:
            row = connection.execute(
                sa.text(
                    """
                    SELECT speakers_json, turns_json
                    FROM transcription_artifacts
                    WHERE transcription_id = :transcription_id
                    """
                ),
                {"transcription_id": transcription_id},
            ).mappings().one()

        assert row["speakers_json"] == [
            {"speaker_key": "unknown", "display_name": "Unknown Speaker"}
        ]
        assert row["turns_json"] == [
            {
                "speaker_key": "unknown",
                "start": 0.0,
                "end": 0.0,
                "text": "Existing transcript text.",
            }
        ]
    finally:
        if engine is not None:
            engine.dispose()
        try:
            if admin_url is not None and database_name is not None:
                _drop_database(admin_url, database_name)
        finally:
            if container_name is not None:
                _stop_postgres_container(container_name)
