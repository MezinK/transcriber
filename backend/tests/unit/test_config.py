from infra.config import get_settings, reset_settings_cache
from infra.db import reset_db_caches


def test_get_settings_reads_local_defaults():
    reset_db_caches()
    reset_settings_cache()
    settings = get_settings()

    assert settings.database_url == "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    assert settings.upload_dir == "/uploads"
    assert settings.max_upload_bytes == 500 * 1024 * 1024
    assert settings.lease_duration_seconds == 120
    assert settings.worker_poll_interval_seconds == 2.0
    assert settings.heartbeat_interval_seconds == 30.0
