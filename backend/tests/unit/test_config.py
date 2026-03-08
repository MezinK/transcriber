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
    assert settings.transcription_backend == "whisperx"
    assert settings.whisper_model == "base"
    assert settings.whisper_device == "cpu"
    assert settings.whisper_compute_type == "int8"
    assert settings.whisper_batch_size == 4
    assert settings.whisper_diarization_enabled is False
    assert settings.whisper_min_speakers is None
    assert settings.whisper_max_speakers is None
    assert settings.hf_token is None


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
    monkeypatch.setenv("TRANSCRIPTION_BACKEND", "whisperx")
    monkeypatch.setenv("WHISPER_MODEL", "large-v2")
    monkeypatch.setenv("WHISPER_DEVICE", "mps")
    monkeypatch.setenv("WHISPER_COMPUTE_TYPE", "float16")
    monkeypatch.setenv("WHISPER_BATCH_SIZE", "12")
    monkeypatch.setenv("WHISPER_DIARIZATION_ENABLED", "false")
    monkeypatch.setenv("WHISPER_MIN_SPEAKERS", "2")
    monkeypatch.setenv("WHISPER_MAX_SPEAKERS", "4")
    monkeypatch.setenv("HF_TOKEN", "secret-token")

    await reset_db_caches()
    reset_settings_cache()

    refreshed_settings = get_settings()
    refreshed_engine = get_engine()

    assert dispose_called
    assert refreshed_settings is not original_settings
    assert refreshed_settings.upload_dir == "/tmp/transcriber-tests"
    assert refreshed_settings.transcription_backend == "whisperx"
    assert refreshed_settings.whisper_model == "large-v2"
    assert refreshed_settings.whisper_device == "mps"
    assert refreshed_settings.whisper_compute_type == "float16"
    assert refreshed_settings.whisper_batch_size == 12
    assert refreshed_settings.whisper_diarization_enabled is False
    assert refreshed_settings.whisper_min_speakers == 2
    assert refreshed_settings.whisper_max_speakers == 4
    assert refreshed_settings.hf_token == "secret-token"
    assert str(refreshed_engine.url) == "postgresql+asyncpg://app:***@localhost:5432/overridden"


@pytest.mark.asyncio
async def test_invalid_numeric_settings_are_rejected(monkeypatch):
    await reset_db_caches()
    reset_settings_cache()
    monkeypatch.setenv("HEARTBEAT_INTERVAL_SECONDS", "0")

    with pytest.raises(ValidationError):
        get_settings()
