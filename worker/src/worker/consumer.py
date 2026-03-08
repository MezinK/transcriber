import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from shared.db import async_session
from shared.models import Transcription, TranscriptionStatus, Worker

logger = logging.getLogger(__name__)

HEARTBEAT_STALE_THRESHOLD = timedelta(minutes=2)


async def register_worker(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        worker = Worker(id=worker_id)
        session.add(worker)
        await session.commit()
    logger.info("Worker %s registered", worker_id)


async def try_claim_job(worker_id: uuid.UUID) -> Transcription | None:
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Transcription)
                .where(Transcription.status == TranscriptionStatus.PENDING)
                .order_by(Transcription.created_at.asc())
                .limit(1)
                .with_for_update(skip_locked=True)
            )
            transcription = result.scalar_one_or_none()

            if transcription is None:
                return None

            transcription.status = TranscriptionStatus.PROCESSING

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(
                    current_job_id=transcription.id,
                    last_heartbeat=datetime.now(UTC),
                )
            )

    logger.info("Worker %s claimed job %s", worker_id, transcription.id)
    return transcription


async def complete_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    result_text: str,
    result_json: dict,
) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Transcription)
                .where(Transcription.id == transcription_id)
                .values(
                    status=TranscriptionStatus.COMPLETED,
                    result_text=result_text,
                    result_json=result_json,
                    completed_at=datetime.now(UTC),
                )
            )
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s completed", transcription_id)


async def fail_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    error: str,
) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Transcription)
                .where(Transcription.id == transcription_id)
                .values(
                    status=TranscriptionStatus.FAILED,
                    error=error,
                    completed_at=datetime.now(UTC),
                )
            )
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s failed: %s", transcription_id, error)


async def send_heartbeat(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(last_heartbeat=datetime.now(UTC))
            )


async def run_reaper() -> None:
    stale_cutoff = datetime.now(UTC) - HEARTBEAT_STALE_THRESHOLD

    async with async_session() as session:
        async with session.begin():
            # Find stale workers with assigned jobs
            result = await session.execute(
                select(Worker)
                .where(
                    Worker.last_heartbeat < stale_cutoff,
                    Worker.current_job_id.isnot(None),
                )
            )
            stale_workers = result.scalars().all()

            for worker in stale_workers:
                logger.warning(
                    "Reaping stale worker %s, resetting job %s",
                    worker.id,
                    worker.current_job_id,
                )
                await session.execute(
                    update(Transcription)
                    .where(Transcription.id == worker.current_job_id)
                    .values(status=TranscriptionStatus.PENDING)
                )
                await session.execute(
                    update(Worker)
                    .where(Worker.id == worker.id)
                    .values(current_job_id=None)
                )
