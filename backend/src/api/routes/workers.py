from fastapi import APIRouter, Query
from sqlalchemy import func, select

from api.schemas import WorkerListResponse, WorkerResponse
from infra.db import get_session_factory
from infra.models import Worker
from services.workers import list_workers

router = APIRouter()


@router.get("/", response_model=WorkerListResponse)
async def list_workers_route(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> WorkerListResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        total = (await session.execute(select(func.count(Worker.id)))).scalar_one()

    workers = await list_workers(
        session_factory=session_factory,
        offset=offset,
        limit=limit,
    )
    return WorkerListResponse(
        items=[WorkerResponse(**worker.__dict__) for worker in workers],
        total=total,
    )
