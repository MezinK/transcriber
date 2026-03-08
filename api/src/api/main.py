from contextlib import asynccontextmanager

from fastapi import FastAPI

from shared.db import engine
from shared.models import Base

from api.routes.transcriptions import router as transcriptions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Transcription API", lifespan=lifespan)
app.include_router(transcriptions_router, prefix="/transcriptions", tags=["transcriptions"])


@app.get("/health")
async def health():
    return {"status": "ok"}
