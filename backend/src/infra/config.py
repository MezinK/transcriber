from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"
    max_upload_bytes: int = Field(default=500 * 1024 * 1024, gt=0)
    lease_duration_seconds: int = Field(default=120, gt=0)
    worker_poll_interval_seconds: float = Field(default=2.0, gt=0)
    heartbeat_interval_seconds: float = Field(default=30.0, gt=0)

    model_config = {"env_prefix": ""}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
