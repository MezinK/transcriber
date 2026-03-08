import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncEngine

from infra.config import DEFAULT_UPLOAD_DIR, get_settings, reset_settings_cache
from infra.db import get_engine, reset_db_caches


@pytest.mark.asyncio
async def test_get_settings_reads_local_defaults():
    await reset_db_caches()
    reset_settings_cache()
    settings = get_settings()

    assert settings.database_url == "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    assert settings.upload_dir == str(DEFAULT_UPLOAD_DIR)
    assert settings.max_upload_bytes == 500 * 1024 * 1024
    assert settings.lease_duration_seconds == 120
    assert settings.worker_poll_interval_seconds == 2.0
    assert settings.heartbeat_interval_seconds == 30.0


@pytest.mark.asyncio
async def test_cache_reset_allows_env_override_and_refresh(monkeypatch):
    await reset_db_caches()
    reset_settings_cache()

    original_settings = get_settings()
    original_engine = get_engine()

    dispose_called = False
    original_dispose = AsyncEngine.dispose

    async def wrapped_dispose(self):
        nonlocal dispose_called
        if self is original_engine:
            dispose_called = True
        await original_dispose(self)

    monkeypatch.setattr(AsyncEngine, "dispose", wrapped_dispose)
    monkeypatch.setenv("UPLOAD_DIR", "/tmp/transcriber-tests")
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://app:app@localhost:5432/overridden")

    await reset_db_caches()
    reset_settings_cache()

    refreshed_settings = get_settings()
    refreshed_engine = get_engine()

    assert dispose_called
    assert refreshed_settings is not original_settings
    assert refreshed_settings.upload_dir == "/tmp/transcriber-tests"
    assert str(refreshed_engine.url) == "postgresql+asyncpg://app:***@localhost:5432/overridden"


@pytest.mark.asyncio
async def test_invalid_numeric_settings_are_rejected(monkeypatch):
    await reset_db_caches()
    reset_settings_cache()
    monkeypatch.setenv("HEARTBEAT_INTERVAL_SECONDS", "0")

    with pytest.raises(ValidationError):
        get_settings()
