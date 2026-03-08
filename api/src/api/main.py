import asyncio
import logging
import uuid as uuid_mod
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware

from shared.db import async_session, get_engine
from shared.models import Base

from api.routes.transcriptions import router as transcriptions_router

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID to every request for tracing."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid_mod.uuid7()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Retry DB schema creation in case Postgres is briefly unavailable
    for attempt in range(5):
        try:
            db_engine = get_engine()
            async with db_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            break
        except Exception:
            if attempt == 4:
                logger.exception("Failed to connect to database after 5 attempts")
                raise
            logger.warning("DB not ready, retrying in 2s (attempt %d/5)", attempt + 1)
            await asyncio.sleep(2)
    yield
    await get_engine().dispose()


app = FastAPI(title="Transcription API", lifespan=lifespan)
app.add_middleware(RequestIDMiddleware)
app.include_router(transcriptions_router, prefix="/transcriptions", tags=["transcriptions"])


@app.get("/health")
async def health():
    """Health check that verifies database connectivity."""
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        logger.exception("Health check failed - database unreachable")
        return {"status": "unhealthy", "detail": "database unreachable"}
