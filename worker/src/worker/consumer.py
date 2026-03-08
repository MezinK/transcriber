import logging
import os
import uuid
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path

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


@dataclass
class ClaimedJob:
    """Plain data object returned from try_claim_job — avoids detached ORM issues."""

    id: uuid.UUID
    file_path: str
    file_name: str


async def register_worker(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        worker = Worker(id=worker_id)
        session.add(worker)
        await session.commit()
    logger.info("Worker %s registered", worker_id)


async def try_claim_job(worker_id: uuid.UUID) -> ClaimedJob | None:
    """Claim a pending job using SELECT ... FOR UPDATE SKIP LOCKED.

    Returns a plain ClaimedJob dataclass (not a live ORM object) to avoid
    DetachedInstanceError when the session closes.
    """
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

            # Capture plain values before session closes
            claimed = ClaimedJob(
                id=transcription.id,
                file_path=transcription.file_path,
                file_name=transcription.file_name,
            )

    logger.info("Worker %s claimed job %s", worker_id, claimed.id)
    return claimed


async def complete_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    result_text: str,
    result_json: dict,
) -> bool:
    """Complete a job and clean up the uploaded file.

    Returns True if the update was applied, False if the job was already reaped.
    """
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
                .returning(Transcription.file_path)
            )
            row = result.first()
            if row is None:
                logger.warning(
                    "Job %s was already reaped/completed, skipping", transcription_id
                )
                return False

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )

    # Clean up uploaded file after successful commit
    _cleanup_file(row.file_path)
    logger.info("Job %s completed", transcription_id)
    return True


async def fail_job(
    worker_id: uuid.UUID,
    transcription_id: uuid.UUID,
    error: str,
) -> bool:
    """Fail a job with retry logic.

    If retries remain, resets the job to PENDING so it will be picked up again.
    If max retries exceeded, marks as permanently FAILED and cleans up the file.
    Returns True if the update was applied, False if the job was already reaped.
    """
    async with async_session() as session:
        async with session.begin():
            # First, check current state with lock
            job_result = await session.execute(
                select(Transcription)
                .where(
                    Transcription.id == transcription_id,
                    Transcription.status == TranscriptionStatus.PROCESSING,
                )
                .with_for_update()
            )
            job = job_result.scalar_one_or_none()

            if job is None:
                logger.warning(
                    "Job %s was already reaped/failed, skipping", transcription_id
                )
                return False

            file_path = job.file_path

            if job.retry_count + 1 < MAX_RETRIES:
                # Retries remain — reset to PENDING
                job.status = TranscriptionStatus.PENDING
                job.retry_count += 1
                logger.info(
                    "Job %s failed (attempt %d/%d), resetting to PENDING: %s",
                    transcription_id,
                    job.retry_count,
                    MAX_RETRIES,
                    error,
                )
            else:
                # Max retries exceeded — permanent failure
                job.status = TranscriptionStatus.FAILED
                job.error = error
                job.completed_at = func.now()
                logger.error(
                    "Job %s failed permanently after %d attempts: %s",
                    transcription_id,
                    job.retry_count + 1,
                    error,
                )

            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(current_job_id=None)
            )

    # Clean up file only on permanent failure
    if job.status == TranscriptionStatus.FAILED:
        _cleanup_file(file_path)

    return True


async def send_heartbeat(worker_id: uuid.UUID) -> None:
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                update(Worker)
                .where(Worker.id == worker_id)
                .values(last_heartbeat=func.now())
            )


async def deregister_worker(worker_id: uuid.UUID, current_job_id: uuid.UUID | None) -> None:
    """Clean up worker row on shutdown. Resets any in-progress job to PENDING."""
    async with async_session() as session:
        async with session.begin():
            if current_job_id is not None:
                await session.execute(
                    update(Transcription)
                    .where(
                        Transcription.id == current_job_id,
                        Transcription.status == TranscriptionStatus.PROCESSING,
                    )
                    .values(
                        status=TranscriptionStatus.PENDING,
                        retry_count=Transcription.retry_count + 1,
                    )
                )
                logger.info("Reset in-progress job %s to PENDING on shutdown", current_job_id)
            await session.execute(delete(Worker).where(Worker.id == worker_id))
    logger.info("Worker %s deregistered", worker_id)


async def run_reaper() -> None:
    """Reap stale workers and reset their jobs.

    Uses separate sessions for reaping and cleanup to avoid the double-begin() bug.
    """
    # Transaction 1: reap stale workers
    async with async_session() as session:
        async with session.begin():
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
                logger.warning(
                    "Reaping stale worker %s, resetting job %s",
                    worker.id,
                    worker.current_job_id,
                )

                job_result = await session.execute(
                    select(Transcription).where(
                        Transcription.id == worker.current_job_id
                    )
                )
                job = job_result.scalar_one_or_none()

                if job and job.retry_count + 1 >= MAX_RETRIES:
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
                    # Clean up the file for permanently failed jobs
                    if job:
                        _cleanup_file(job.file_path)
                else:
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

    # Transaction 2: clean up long-dead worker rows (separate session)
    async with async_session() as session:
        async with session.begin():
            await session.execute(
                delete(Worker).where(
                    Worker.last_heartbeat < func.now() - WORKER_CLEANUP_THRESHOLD,
                    Worker.current_job_id.is_(None),
                )
            )


def _cleanup_file(file_path: str) -> None:
    """Delete an uploaded file, logging but not raising on failure."""
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.info("Cleaned up file %s", file_path)
    except OSError:
        logger.exception("Failed to clean up file %s", file_path)
