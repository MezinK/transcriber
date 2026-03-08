from infra.config import get_settings


def test_get_settings_reads_local_defaults():
    settings = get_settings()

    assert settings.upload_dir
    assert settings.database_url.startswith("postgresql+asyncpg://")
