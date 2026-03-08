import uuid

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from shared.db import async_session
from shared.models import Worker
from shared.schemas import WorkerListResponse, WorkerResponse

router = APIRouter()


@router.get("/", response_model=WorkerListResponse)
async def list_workers(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List all registered workers with their current job info."""
    async with async_session() as session:
        async with session.begin():
            count = (await session.execute(select(func.count(Worker.id)))).scalar_one()
            result = await session.execute(
                select(Worker)
                .options(joinedload(Worker.current_job))
                .order_by(Worker.started_at.desc())
                .offset(offset)
                .limit(limit)
            )
            workers = result.unique().scalars().all()

    return WorkerListResponse(items=workers, total=count)


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(worker_id: uuid.UUID):
    """Get a single worker's details."""
    async with async_session() as session:
        result = await session.execute(
            select(Worker)
            .options(joinedload(Worker.current_job))
            .where(Worker.id == worker_id)
        )
        worker = result.unique().scalar_one_or_none()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        return worker
