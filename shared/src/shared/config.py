from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"
    max_upload_bytes: int = 500 * 1024 * 1024  # 500 MB

    # DB pool settings
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    model_config = {"env_prefix": ""}


settings = Settings()
