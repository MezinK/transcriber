from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"
    max_upload_bytes: int = 500 * 1024 * 1024  # 500 MB

    # DB pool settings — override via env for worker (small pool) vs API (larger pool)
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_timeout: int = 30

    model_config = {"env_prefix": ""}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Lazily create settings — allows env vars to be set before first import."""
    return Settings()
