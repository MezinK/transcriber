from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
import uuid

from typing import Protocol

from sqlalchemy import delete, exists, select, update
from sqlalchemy.orm import selectinload

from infra.models import (
    JobLease,
    MediaType,
    Transcription,
    TranscriptionArtifact,
    TranscriptionStatus,
    Worker,
    WorkerStatus,
)
from infra.time import utc_now
from services.storage import remove_file


@dataclass(frozen=True, slots=True)
class ClaimedTranscription:
    transcription_id: uuid.UUID
    source_filename: str
    media_type: MediaType
    upload_path: str
    attempt: int
    leased_until: datetime


@dataclass(frozen=True, slots=True)
class LeaseState:
    transcription_id: uuid.UUID
    worker_id: uuid.UUID
    attempt: int
    heartbeat_at: datetime
    leased_until: datetime


@dataclass(frozen=True, slots=True)
class RecoverySummary:
    requeued_ids: tuple[uuid.UUID, ...]
    failed_ids: tuple[uuid.UUID, ...]


class JobLifecycleError(RuntimeError):
    pass


class LeaseNotOwnedError(JobLifecycleError):
    pass


class TranscriptionDeletionConflictError(JobLifecycleError):
    pass


class SessionProtocol(Protocol):
    def add(self, instance: object) -> None: ...

    async def execute(self, statement): ...

    async def commit(self) -> None: ...


class SessionContextManager(Protocol):
    async def __aenter__(self) -> SessionProtocol: ...

    async def __aexit__(self, exc_type, exc, tb) -> None: ...


def _lease_expiry(*, now: datetime, lease_duration_seconds: int) -> datetime:
    return now + timedelta(seconds=lease_duration_seconds)


async def _update_worker(
    session: SessionProtocol,
    *,
    worker_id: uuid.UUID,
    status: WorkerStatus,
    now: datetime,
    current_transcription_id: uuid.UUID | None,
    last_error: str | None = None,
) -> None:
    await session.execute(
        update(Worker)
        .where(Worker.id == worker_id)
        .values(
            status=status,
            last_heartbeat=now,
            current_transcription_id=current_transcription_id,
            last_error=last_error,
        )
    )


async def _get_owned_lease(
    session: SessionProtocol,
    *,
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
):
    result = await session.execute(
        select(JobLease)
        .options(
            selectinload(JobLease.transcription).selectinload(Transcription.artifact)
        )
        .where(JobLease.transcription_id == transcription_id)
        .with_for_update()
    )
    lease = result.scalar_one_or_none()
    if lease is None or lease.worker_id != worker_id:
        raise LeaseNotOwnedError(
            f"Worker {worker_id} does not own transcription {transcription_id}"
        )
    return lease


async def claim_next_transcription(
    *,
    session_factory: Callable[[], SessionContextManager],
    worker_id: uuid.UUID,
    lease_duration_seconds: int,
    now_factory: Callable[[], datetime] = utc_now,
) -> ClaimedTranscription | None:
    async with session_factory() as session:
        result = await session.execute(
            select(Transcription)
            .options(selectinload(Transcription.artifact))
            .where(Transcription.status == TranscriptionStatus.PENDING)
            .where(
                ~exists(
                    select(JobLease.transcription_id).where(
                        JobLease.transcription_id == Transcription.id
                    )
                )
            )
            .order_by(Transcription.created_at, Transcription.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        transcription = result.scalar_one_or_none()
        if transcription is None:
            return None
        if transcription.artifact is None:
            raise JobLifecycleError(
                f"Transcription {transcription.id} is missing its artifact row"
            )

        now = now_factory()
        attempt = transcription.attempt_count + 1
        lease = JobLease(
            transcription_id=transcription.id,
            worker_id=worker_id,
            leased_until=_lease_expiry(
                now=now, lease_duration_seconds=lease_duration_seconds
            ),
            heartbeat_at=now,
            attempt=attempt,
        )
        transcription.status = TranscriptionStatus.PROCESSING
        transcription.attempt_count = attempt
        transcription.error = None
        transcription.completed_at = None

        await session.execute(
            update(Worker)
            .where(Worker.id == worker_id)
            .values(
                status=WorkerStatus.PROCESSING,
                last_heartbeat=now,
                current_transcription_id=transcription.id,
                last_error=None,
            )
        )
        session.add(lease)
        await session.commit()
        return ClaimedTranscription(
            transcription_id=transcription.id,
            source_filename=transcription.source_filename,
            media_type=transcription.media_type,
            upload_path=transcription.artifact.upload_path,
            attempt=lease.attempt,
            leased_until=lease.leased_until,
        )


async def renew_lease(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
    lease_duration_seconds: int,
    now_factory: Callable[[], datetime] = utc_now,
) -> LeaseState:
    async with session_factory() as session:
        lease = await _get_owned_lease(
            session,
            transcription_id=transcription_id,
            worker_id=worker_id,
        )
        now = now_factory()
        lease.heartbeat_at = now
        lease.leased_until = _lease_expiry(
            now=now,
            lease_duration_seconds=lease_duration_seconds,
        )
        await _update_worker(
            session,
            worker_id=worker_id,
            status=WorkerStatus.PROCESSING,
            now=now,
            current_transcription_id=transcription_id,
        )
        await session.commit()
        return LeaseState(
            transcription_id=transcription_id,
            worker_id=worker_id,
            attempt=lease.attempt,
            heartbeat_at=lease.heartbeat_at,
            leased_until=lease.leased_until,
        )


async def complete_transcription(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
    transcript_text: str,
    segments_json: dict | None,
    now_factory: Callable[[], datetime] = utc_now,
) -> None:
    upload_path: str | None = None
    async with session_factory() as session:
        lease = await _get_owned_lease(
            session,
            transcription_id=transcription_id,
            worker_id=worker_id,
        )
        if lease.transcription is None or lease.transcription.artifact is None:
            raise JobLifecycleError(
                f"Transcription {transcription_id} is missing its artifact row"
            )
        now = now_factory()
        lease.transcription.status = TranscriptionStatus.COMPLETED
        lease.transcription.error = None
        lease.transcription.completed_at = now
        lease.transcription.artifact.transcript_text = transcript_text
        lease.transcription.artifact.segments_json = segments_json
        upload_path = lease.transcription.artifact.upload_path
        await _update_worker(
            session,
            worker_id=worker_id,
            status=WorkerStatus.IDLE,
            now=now,
            current_transcription_id=None,
        )
        await session.execute(
            delete(JobLease).where(JobLease.transcription_id == transcription_id)
        )
        await session.commit()
    if upload_path is not None:
        remove_file(Path(upload_path))


async def fail_transcription(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
    error: str,
    max_attempts: int,
    retryable: bool = True,
    now_factory: Callable[[], datetime] = utc_now,
) -> TranscriptionStatus:
    upload_path: str | None = None
    async with session_factory() as session:
        lease = await _get_owned_lease(
            session,
            transcription_id=transcription_id,
            worker_id=worker_id,
        )
        now = now_factory()
        final_failure = not retryable or lease.attempt >= max_attempts
        lease.transcription.error = error
        lease.transcription.completed_at = None
        if final_failure:
            lease.transcription.status = TranscriptionStatus.FAILED
            if lease.transcription.artifact is not None:
                upload_path = lease.transcription.artifact.upload_path
            next_status = TranscriptionStatus.FAILED
        else:
            lease.transcription.status = TranscriptionStatus.PENDING
            next_status = TranscriptionStatus.PENDING
        await _update_worker(
            session,
            worker_id=worker_id,
            status=WorkerStatus.IDLE,
            now=now,
            current_transcription_id=None,
            last_error=error,
        )
        await session.execute(
            delete(JobLease).where(JobLease.transcription_id == transcription_id)
        )
        await session.commit()
    if upload_path is not None:
        remove_file(Path(upload_path))
    return next_status


async def recover_stale_leases(
    *,
    session_factory: Callable[[], SessionContextManager],
    max_attempts: int,
    now_factory: Callable[[], datetime] = utc_now,
) -> RecoverySummary:
    now = now_factory()
    upload_paths: list[str] = []
    requeued_ids: list[uuid.UUID] = []
    failed_ids: list[uuid.UUID] = []

    async with session_factory() as session:
        result = await session.execute(
            select(JobLease)
            .options(
                selectinload(JobLease.transcription).selectinload(Transcription.artifact)
            )
            .where(JobLease.leased_until < now)
            .order_by(JobLease.leased_until, JobLease.transcription_id)
            .with_for_update(skip_locked=True)
        )
        stale_leases = list(result.scalars())

        for lease in stale_leases:
            if lease.transcription is None:
                continue
            if lease.attempt >= max_attempts:
                lease.transcription.status = TranscriptionStatus.FAILED
                lease.transcription.error = "Lease expired before transcription completed"
                if lease.transcription.artifact is not None:
                    upload_paths.append(lease.transcription.artifact.upload_path)
                failed_ids.append(lease.transcription_id)
            else:
                lease.transcription.status = TranscriptionStatus.PENDING
                lease.transcription.error = "Lease expired; job returned to queue"
                requeued_ids.append(lease.transcription_id)

            lease.transcription.completed_at = None
            await session.execute(
                update(Worker)
                .where(Worker.id == lease.worker_id)
                .values(
                    status=WorkerStatus.STALE,
                    current_transcription_id=None,
                    last_error="Lease expired",
                )
            )

        if stale_leases:
            stale_ids = [lease.transcription_id for lease in stale_leases]
            await session.execute(
                delete(JobLease).where(JobLease.transcription_id.in_(stale_ids))
            )

        await session.commit()

    for upload_path in upload_paths:
        remove_file(Path(upload_path))

    return RecoverySummary(
        requeued_ids=tuple(requeued_ids),
        failed_ids=tuple(failed_ids),
    )


async def ensure_transcription_deletable(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
) -> None:
    async with session_factory() as session:
        result = await session.execute(
            select(JobLease.transcription_id).where(
                JobLease.transcription_id == transcription_id
            )
        )
        if result.scalar_one_or_none() is not None:
            raise TranscriptionDeletionConflictError(
                f"Transcription {transcription_id} has an active lease"
            )
