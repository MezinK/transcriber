from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/transcriptions"
    upload_dir: str = "/uploads"

    model_config = {"env_prefix": ""}


settings = Settings()
