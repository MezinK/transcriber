from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from shared.config import get_settings


@lru_cache(maxsize=1)
def get_engine():
    """Lazily create the async engine — pool settings come from env at first call."""
    s = get_settings()
    return create_async_engine(
        s.database_url,
        pool_size=s.db_pool_size,
        max_overflow=s.db_max_overflow,
        pool_timeout=s.db_pool_timeout,
        pool_pre_ping=True,
    )


@lru_cache(maxsize=1)
def get_session_factory():
    """Lazily create the session factory."""
    return async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)


class _SessionProxy:
    """Callable proxy so `async_session()` works like before, but lazily initializes."""

    def __call__(self):
        return get_session_factory()()


async_session = _SessionProxy()
