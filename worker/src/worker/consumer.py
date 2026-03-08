import logging
import uuid
from datetime import timedelta

from sqlalchemy import delete, func, select, update

from shared.db import async_session
from shared.models import (
    MAX_RETRIES,
    Transcription,
    TranscriptionStatus,
    Worker,
)

logger = logging.getLogger(__name__)

HEARTBEAT_STALE_THRESHOLD = timedelta(minutes=2)
WORKER_CLEANUP_THRESHOLD = timedelta(minutes=10)


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
                    last_heartbeat=func.now(),
                )
            )

    logger.info("Worker %s claimed job %s", worker_id, transcription.id)
    return transcription


async def complete_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    result_text: str,
    result_json: dict,
) -> bool:
    """Complete a job. Returns True if the update was applied, False if the job was already reaped."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(Transcription)
                .where(
                    Transcription.id == transcription_id,
                    Transcription.status == TranscriptionStatus.PROCESSING,
                )
                .values(
                    status=TranscriptionStatus.COMPLETED,
                    result_text=result_text,
                    result_json=result_json,
                    completed_at=func.now(),
                )
            )
            if result.rowcount == 0:
                logger.warning(
                    "Job %s was already reaped/completed, skipping", transcription_id
                )
                return False

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s completed", transcription_id)
    return True


async def fail_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    error: str,
) -> bool:
    """Fail a job. Returns True if the update was applied, False if the job was already reaped."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                update(Transcription)
                .where(
                    Transcription.id == transcription_id,
                    Transcription.status == TranscriptionStatus.PROCESSING,
                )
                .values(
                    status=TranscriptionStatus.FAILED,
                    error=error,
                    completed_at=func.now(),
                )
            )
            if result.rowcount == 0:
                logger.warning(
                    "Job %s was already reaped/failed, skipping", transcription_id
                )
                return False

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )
    logger.info("Job %s failed: %s", transcription_id, error)
    return True


async def send_heartbeat(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(last_heartbeat=func.now())
            )


async def run_reaper() -> None:
    async with async_session() as session:
        async with session.begin():
            # Lock stale workers exclusively — prevents multiple reapers from
            # processing the same stale worker simultaneously.
            result = await session.execute(
                select(Worker)
                .where(
                    Worker.last_heartbeat < func.now() - HEARTBEAT_STALE_THRESHOLD,
                    Worker.current_job_id.isnot(None),
                )
                .with_for_update(skip_locked=True)
            )
            stale_workers = result.scalars().all()

            for worker in stale_workers:
                # Re-check staleness inside the lock (TOCTOU protection)
                logger.warning(
                    "Reaping stale worker %s, resetting job %s",
                    worker.id,
                    worker.current_job_id,
                )

                # Check retry count before resetting
                job_result = await session.execute(
                    select(Transcription).where(
                        Transcription.id == worker.current_job_id
                    )
                )
                job = job_result.scalar_one_or_none()

                if job and job.retry_count + 1 >= MAX_RETRIES:
                    # Exceeded max retries — mark as failed
                    await session.execute(
                        update(Transcription)
                        .where(Transcription.id == worker.current_job_id)
                        .values(
                            status=TranscriptionStatus.FAILED,
                            error=f"Max retries ({MAX_RETRIES}) exceeded — job repeatedly failed or crashed workers",
                            completed_at=func.now(),
                        )
                    )
                    logger.error(
                        "Job %s failed permanently after %d retries",
                        worker.current_job_id,
                        job.retry_count + 1,
                    )
                else:
                    # Reset to pending with incremented retry count
                    await session.execute(
                        update(Transcription)
                        .where(Transcription.id == worker.current_job_id)
                        .values(
                            status=TranscriptionStatus.PENDING,
                            retry_count=Transcription.retry_count + 1,
                        )
                    )

                await session.execute(
                    update(Worker)
                    .where(Worker.id == worker.id)
                    .values(current_job_id=None)
                )

        # Clean up long-dead worker rows (no job assigned, stale > 10 min)
        async with session.begin():
            await session.execute(
                delete(Worker).where(
                    Worker.last_heartbeat < func.now() - WORKER_CLEANUP_THRESHOLD,
                    Worker.current_job_id.is_(None),
                )
            )
