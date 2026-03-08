from fastapi import APIRouter, Query

from api.schemas import WorkerListResponse, WorkerResponse
from services.workers import list_workers


def build_router(*, session_factory) -> APIRouter:
    router = APIRouter()

    @router.get("/", response_model=WorkerListResponse)
    async def get_workers(
        offset: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
    ):
        workers = await list_workers(
            session_factory=session_factory,
            offset=offset,
            limit=limit,
        )
        items = [
            WorkerResponse(
                id=worker.id,
                label=worker.label,
                status=worker.status,
                started_at=worker.started_at,
                last_heartbeat=worker.last_heartbeat,
                current_transcription_id=worker.current_transcription_id,
                last_error=worker.last_error,
            )
            for worker in workers
        ]
        return WorkerListResponse(items=items, total=len(items))

    return router
