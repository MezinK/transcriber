from pathlib import Path
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


DEFAULT_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "var" / "uploads"


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = str(DEFAULT_UPLOAD_DIR)
    max_upload_bytes: int = Field(default=500 * 1024 * 1024, gt=0)
    lease_duration_seconds: int = Field(default=120, gt=0)
    worker_poll_interval_seconds: float = Field(default=2.0, gt=0)
    heartbeat_interval_seconds: float = Field(default=30.0, gt=0)
    diarization_engine: str = "pyannote"
    diarization_device: str = "cpu"
    pyannote_auth_token: str | None = None

    model_config = {"env_prefix": ""}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
