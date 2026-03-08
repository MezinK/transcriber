from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import uuid

from sqlalchemy import select

from infra.models import Worker, WorkerStatus
from infra.time import utc_now

STALE_AFTER_SECONDS = 120


@dataclass
class WorkerSnapshot:
    id: uuid.UUID
    label: str | None
    status: WorkerStatus
    started_at: datetime
    last_heartbeat: datetime
    current_transcription_id: uuid.UUID | None
    last_error: str | None


async def register_worker(
    *,
    session_factory,
    worker_id: uuid.UUID,
    label: str | None = None,
    now: Callable[[], datetime] = utc_now,
) -> WorkerSnapshot:
    async with session_factory() as session:
        async with session.begin():
            worker = await session.get(Worker, worker_id, with_for_update=True)
            if worker is None:
                worker = Worker(
                    id=worker_id,
                    label=label,
                    status=WorkerStatus.IDLE,
                    started_at=now(),
                    last_heartbeat=now(),
                )
                session.add(worker)
            else:
                worker.label = label
                worker.status = WorkerStatus.IDLE
                worker.current_transcription_id = None
                worker.last_error = None
                worker.last_heartbeat = now()

            return WorkerSnapshot(
                id=worker.id,
                label=worker.label,
                status=worker.status,
                started_at=worker.started_at,
                last_heartbeat=worker.last_heartbeat,
                current_transcription_id=worker.current_transcription_id,
                last_error=worker.last_error,
            )


async def heartbeat_worker(
    *,
    session_factory,
    worker_id: uuid.UUID,
    now: Callable[[], datetime] = utc_now,
) -> bool:
    async with session_factory() as session:
        async with session.begin():
            worker = await session.get(Worker, worker_id, with_for_update=True)
            if worker is None:
                return False

            worker.last_heartbeat = now()
            return True


async def set_worker_current_job(
    *,
    session_factory,
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    now: Callable[[], datetime] = utc_now,
) -> bool:
    async with session_factory() as session:
        async with session.begin():
            worker = await session.get(Worker, worker_id, with_for_update=True)
            if worker is None:
                return False

            worker.status = WorkerStatus.PROCESSING
            worker.current_transcription_id = transcription_id
            worker.last_error = None
            worker.last_heartbeat = now()
            return True


async def clear_worker_current_job(
    *,
    session_factory,
    worker_id: uuid.UUID,
    last_error: str | None = None,
    now: Callable[[], datetime] = utc_now,
) -> bool:
    async with session_factory() as session:
        async with session.begin():
            worker = await session.get(Worker, worker_id, with_for_update=True)
            if worker is None:
                return False

            worker.status = WorkerStatus.IDLE
            worker.current_transcription_id = None
            worker.last_error = last_error
            worker.last_heartbeat = now()
            return True


async def list_workers(
    *,
    session_factory,
    stale_after_seconds: int = STALE_AFTER_SECONDS,
    now: Callable[[], datetime] = utc_now,
    offset: int = 0,
    limit: int = 20,
) -> list[WorkerSnapshot]:
    threshold = now() - timedelta(seconds=stale_after_seconds)

    async with session_factory() as session:
        result = await session.execute(
            select(Worker).order_by(Worker.started_at.desc()).offset(offset).limit(limit)
        )
        workers = result.scalars().all()

    snapshots: list[WorkerSnapshot] = []
    for worker in workers:
        status = worker.status
        if _normalize_timestamp(worker.last_heartbeat) < threshold:
            status = WorkerStatus.STALE

        snapshots.append(
            WorkerSnapshot(
                id=worker.id,
                label=worker.label,
                status=status,
                started_at=worker.started_at,
                last_heartbeat=worker.last_heartbeat,
                current_transcription_id=worker.current_transcription_id,
                last_error=worker.last_error,
            )
        )

    return snapshots


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
