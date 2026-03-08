import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.db import engine
from shared.models import Base

from api.routes.transcriptions import router as transcriptions_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Retry DB schema creation in case Postgres is briefly unavailable
    for attempt in range(5):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            break
        except Exception:
            if attempt == 4:
                logger.exception("Failed to connect to database after 5 attempts")
                raise
            logger.warning("DB not ready, retrying in 2s (attempt %d/5)", attempt + 1)
            await asyncio.sleep(2)
    yield
    await engine.dispose()


app = FastAPI(title="Transcription API", lifespan=lifespan)
app.include_router(transcriptions_router, prefix="/transcriptions", tags=["transcriptions"])


@app.get("/health")
async def health():
    return {"status": "ok"}
