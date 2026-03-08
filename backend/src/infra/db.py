from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from infra.config import get_settings


@lru_cache(maxsize=1)
def get_engine():
    settings = get_settings()
    return create_async_engine(settings.database_url, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_session_factory():
    return async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)


async def reset_db_caches() -> None:
    engine = get_engine() if get_engine.cache_info().currsize else None
    if engine is not None:
        await engine.dispose()
    get_session_factory.cache_clear()
    get_engine.cache_clear()
