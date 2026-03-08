from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from api.routes.transcriptions import build_router as build_transcriptions_router
from api.routes.workers import build_router as build_workers_router
from infra.config import get_settings
from infra.db import get_session_factory


def create_app(*, session_factory=None, settings=None) -> FastAPI:
    session_factory = session_factory or get_session_factory()
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield

    app = FastAPI(title="Transcription API", lifespan=lifespan)
    app.include_router(
        build_transcriptions_router(session_factory=session_factory, settings=settings),
        prefix="/transcriptions",
        tags=["transcriptions"],
    )
    app.include_router(
        build_workers_router(session_factory=session_factory),
        prefix="/workers",
        tags=["workers"],
    )

    @app.get("/health")
    async def health():
        try:
            async with session_factory() as session:
                await session.execute(text("SELECT 1"))
        except Exception as exc:
            raise HTTPException(status_code=503, detail="database unreachable") from exc

        return {"status": "ok"}

    return app


app = create_app()
