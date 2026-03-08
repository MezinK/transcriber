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
    transcription_backend: str = "whisperx"
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_batch_size: int = Field(default=4, gt=0)
    whisper_diarization_enabled: bool = True
    whisper_min_speakers: int | None = Field(default=None, gt=0)
    whisper_max_speakers: int | None = Field(default=None, gt=0)
    hf_token: str | None = None

    model_config = {"env_prefix": ""}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
