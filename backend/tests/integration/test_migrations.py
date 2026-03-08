from dataclasses import dataclass
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
import pytest
from sqlalchemy import create_engine


@dataclass
class AppliedDatabase:
    current_revision: str | None


@pytest.fixture
def applied_database(tmp_path: Path) -> AppliedDatabase:
    database_path = tmp_path / "migrations.sqlite3"
    config = Config("alembic.ini")
    config.set_main_option("script_location", "alembic")
    config.set_main_option("sqlalchemy.url", f"sqlite:///{database_path}")

    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{database_path}")
    with engine.connect() as connection:
        current_revision = MigrationContext.configure(connection).get_current_revision()

    return AppliedDatabase(current_revision=current_revision)


def test_alembic_upgrade_head(applied_database: AppliedDatabase):
    assert applied_database.current_revision == "20260308_000001"
