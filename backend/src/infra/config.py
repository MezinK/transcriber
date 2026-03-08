from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"
    max_upload_bytes: int = 500 * 1024 * 1024
    lease_duration_seconds: int = 120
    worker_poll_interval_seconds: float = 2.0
    heartbeat_interval_seconds: float = 30.0

    model_config = {"env_prefix": ""}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
