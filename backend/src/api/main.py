from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import select

from api.routes.transcriptions import router as transcriptions_router
from api.schemas import HealthResponse
from api.routes.workers import router as workers_router
from infra.db import get_session_factory


def create_app() -> FastAPI:
    app = FastAPI(title="Transcriber API")

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse | JSONResponse:
        try:
            session_factory = get_session_factory()
            async with session_factory() as session:
                await session.execute(select(1))
        except Exception:
            return JSONResponse(status_code=503, content={"status": "unhealthy"})
        return HealthResponse(status="ok")

    app.include_router(transcriptions_router, prefix="/transcriptions", tags=["transcriptions"])
    app.include_router(workers_router, prefix="/workers", tags=["workers"])
    return app


app = create_app()
