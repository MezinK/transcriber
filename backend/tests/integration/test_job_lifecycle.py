from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from infra.models import (
    JobLease,
    MediaType,
    Transcription,
    TranscriptionArtifact,
    TranscriptionStatus,
    Worker,
    WorkerStatus,
)
from services.jobs import (
    claim_next_transcription,
    complete_transcription,
    recover_stale_leases,
)
from services.uploads import delete_upload


async def _create_worker(
    session_factory: async_sessionmaker,
    *,
    worker_id: uuid.UUID,
    label: str,
) -> Worker:
    worker = Worker(id=worker_id, label=label)
    async with session_factory() as session:
        session.add(worker)
        await session.commit()
    return worker


async def _create_transcription(
    session_factory: async_sessionmaker,
    *,
    upload_path: str,
    status: TranscriptionStatus = TranscriptionStatus.PENDING,
    attempt_count: int = 0,
) -> Transcription:
    transcription = Transcription(
        source_filename=Path(upload_path).name,
        media_type=MediaType.AUDIO,
        status=status,
        attempt_count=attempt_count,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path=upload_path,
    )
    async with session_factory() as session:
        session.add(transcription)
        session.add(artifact)
        await session.commit()
    return transcription


async def _create_lease(
    session_factory: async_sessionmaker,
    *,
    transcription_id: uuid.UUID,
    worker_id: uuid.UUID,
    leased_until: datetime,
    attempt: int,
) -> None:
    lease = JobLease(
        transcription_id=transcription_id,
        worker_id=worker_id,
        leased_until=leased_until,
        heartbeat_at=leased_until - timedelta(seconds=30),
        attempt=attempt,
    )
    async with session_factory() as session:
        session.add(lease)
        await session.commit()


class _SessionProxy:
    def __init__(self, session):
        self._session = session

    def __getattr__(self, name):
        return getattr(self._session, name)


class _FailingCommitSession(_SessionProxy):
    async def commit(self) -> None:
        raise RuntimeError("commit failed")


class _DelayedCommitSession(_SessionProxy):
    def __init__(self, session, *, entered_event: asyncio.Event, release_event: asyncio.Event):
        super().__init__(session)
        self._entered_event = entered_event
        self._release_event = release_event

    async def commit(self) -> None:
        self._entered_event.set()
        await self._release_event.wait()
        await self._session.commit()


class _ProxySessionFactory:
    def __init__(self, session_factory: async_sessionmaker, proxy_factory):
        self._session_factory = session_factory
        self._proxy_factory = proxy_factory

    def __call__(self):
        return _ProxySessionContext(self._session_factory, self._proxy_factory)


class _ProxySessionContext:
    def __init__(self, session_factory: async_sessionmaker, proxy_factory):
        self._session_factory = session_factory
        self._proxy_factory = proxy_factory
        self._context = None

    async def __aenter__(self):
        self._context = self._session_factory()
        session = await self._context.__aenter__()
        return self._proxy_factory(session)

    async def __aexit__(self, exc_type, exc, tb):
        return await self._context.__aexit__(exc_type, exc, tb)


@pytest.mark.asyncio
async def test_recover_stale_leases_requeues_or_fails_based_on_attempts(
    database,
    tmp_path: Path,
):
    now = datetime(2026, 3, 8, 12, 0, tzinfo=UTC)
    worker_one = uuid.uuid4()
    worker_two = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_one, label="worker-1")
    await _create_worker(database.session_factory, worker_id=worker_two, label="worker-2")

    retry_file = tmp_path / "retry.wav"
    retry_file.write_bytes(b"retry")
    failed_file = tmp_path / "failed.wav"
    failed_file.write_bytes(b"failed")

    retry_transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(retry_file),
        status=TranscriptionStatus.PROCESSING,
        attempt_count=1,
    )
    failed_transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(failed_file),
        status=TranscriptionStatus.PROCESSING,
        attempt_count=2,
    )

    await _create_lease(
        database.session_factory,
        transcription_id=retry_transcription.id,
        worker_id=worker_one,
        leased_until=now - timedelta(minutes=1),
        attempt=1,
    )
    await _create_lease(
        database.session_factory,
        transcription_id=failed_transcription.id,
        worker_id=worker_two,
        leased_until=now - timedelta(minutes=1),
        attempt=2,
    )

    summary = await recover_stale_leases(
        session_factory=database.session_factory,
        max_attempts=2,
        upload_dir=tmp_path,
        now_factory=lambda: now,
    )

    assert summary.requeued_ids == (retry_transcription.id,)
    assert summary.failed_ids == (failed_transcription.id,)

    async with database.session_factory() as session:
        refreshed_retry = await session.get(Transcription, retry_transcription.id)
        refreshed_failed = await session.get(Transcription, failed_transcription.id)
        workers = (
            await session.execute(select(Worker).order_by(Worker.label))
        ).scalars().all()
        leases = (await session.execute(select(JobLease))).scalars().all()

    assert refreshed_retry.status == TranscriptionStatus.PENDING
    assert refreshed_retry.error == "Lease expired; job returned to queue"
    assert refreshed_failed.status == TranscriptionStatus.FAILED
    assert refreshed_failed.error == "Lease expired before transcription completed"
    assert leases == []
    assert [worker.status for worker in workers] == [WorkerStatus.STALE, WorkerStatus.STALE]
    assert all(worker.current_transcription_id is None for worker in workers)
    assert retry_file.exists() is True
    assert failed_file.exists() is False


@pytest.mark.asyncio
async def test_claim_next_transcription_does_not_duplicate_claims(
    database,
    tmp_path: Path,
):
    worker_one = uuid.uuid4()
    worker_two = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_one, label="worker-1")
    await _create_worker(database.session_factory, worker_id=worker_two, label="worker-2")
    pending_file = tmp_path / "pending.wav"
    pending_file.write_bytes(b"pending")
    transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(pending_file),
    )

    entered_event = asyncio.Event()
    release_event = asyncio.Event()
    delayed_factory = _ProxySessionFactory(
        database.session_factory,
        lambda session: _DelayedCommitSession(
            session,
            entered_event=entered_event,
            release_event=release_event,
        ),
    )

    task_one = asyncio.create_task(
        claim_next_transcription(
            session_factory=delayed_factory,
            worker_id=worker_one,
            lease_duration_seconds=120,
            now_factory=lambda: datetime(2026, 3, 8, 12, 10, tzinfo=UTC),
        )
    )
    await asyncio.wait_for(entered_event.wait(), timeout=5)

    task_two_claim = await claim_next_transcription(
        session_factory=database.session_factory,
        worker_id=worker_two,
        lease_duration_seconds=120,
        now_factory=lambda: datetime(2026, 3, 8, 12, 10, tzinfo=UTC),
    )

    assert task_two_claim is None

    release_event.set()
    task_one_claim = await asyncio.wait_for(task_one, timeout=5)

    assert task_one_claim is not None
    assert task_one_claim.transcription_id == transcription.id

    async with database.session_factory() as session:
        leases = (await session.execute(select(JobLease))).scalars().all()
        workers = (
            await session.execute(select(Worker).order_by(Worker.label))
        ).scalars().all()
        refreshed = await session.get(Transcription, transcription.id)

    assert len(leases) == 1
    assert leases[0].worker_id == worker_one
    assert refreshed.status == TranscriptionStatus.PROCESSING
    assert [worker.status for worker in workers] == [
        WorkerStatus.PROCESSING,
        WorkerStatus.IDLE,
    ]


@pytest.mark.asyncio
async def test_complete_transcription_removes_upload_only_after_commit(
    database,
    tmp_path: Path,
):
    worker_id = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_id, label="worker-1")
    upload_file = tmp_path / "complete.wav"
    upload_file.write_bytes(b"audio")
    transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(upload_file),
    )

    claimed = await claim_next_transcription(
        session_factory=database.session_factory,
        worker_id=worker_id,
        lease_duration_seconds=120,
        now_factory=lambda: datetime(2026, 3, 8, 12, 20, tzinfo=UTC),
    )
    assert claimed is not None
    assert claimed.transcription_id == transcription.id

    failing_factory = _ProxySessionFactory(
        database.session_factory,
        lambda session: _FailingCommitSession(session),
    )

    with pytest.raises(RuntimeError, match="commit failed"):
        await complete_transcription(
            session_factory=failing_factory,
            transcription_id=transcription.id,
            worker_id=worker_id,
            segments_json={"segments": [{"text": "done"}]},
            speakers_json=[{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
            turns_json=[
                {
                    "speaker_key": "speaker_0",
                    "start": 0.0,
                    "end": 1.0,
                    "text": "done",
                }
            ],
            upload_dir=tmp_path,
            now_factory=lambda: datetime(2026, 3, 8, 12, 21, tzinfo=UTC),
        )

    assert upload_file.exists() is True

    async with database.session_factory() as session:
        failed_commit_transcription = await session.get(Transcription, transcription.id)
        failed_commit_artifact = await session.get(
            TranscriptionArtifact, transcription.id
        )
        failed_commit_lease = await session.get(JobLease, transcription.id)

    assert failed_commit_transcription.status == TranscriptionStatus.PROCESSING
    assert failed_commit_artifact.speakers_json is None
    assert failed_commit_artifact.turns_json is None
    assert failed_commit_lease is not None

    await complete_transcription(
        session_factory=database.session_factory,
        transcription_id=transcription.id,
        worker_id=worker_id,
        segments_json={"segments": [{"text": "done"}]},
        speakers_json=[{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
        turns_json=[
            {
                "speaker_key": "speaker_0",
                "start": 0.0,
                "end": 1.0,
                "text": "done",
            }
        ],
        upload_dir=tmp_path,
        now_factory=lambda: datetime(2026, 3, 8, 12, 22, tzinfo=UTC),
    )

    async with database.session_factory() as session:
        completed_transcription = await session.get(Transcription, transcription.id)
        completed_artifact = await session.get(TranscriptionArtifact, transcription.id)
        completed_lease = await session.get(JobLease, transcription.id)
        completed_worker = await session.get(Worker, worker_id)

    assert completed_transcription.status == TranscriptionStatus.COMPLETED
    assert completed_artifact.speakers_json == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
    ]
    assert completed_artifact.turns_json == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 1.0,
            "text": "done",
        }
    ]
    assert completed_lease is None
    assert completed_worker.status == WorkerStatus.IDLE
    assert upload_file.exists() is False


@pytest.mark.asyncio
async def test_delete_upload_prevents_concurrent_claim_before_commit(
    database,
    tmp_path: Path,
):
    worker_id = uuid.uuid4()
    await _create_worker(database.session_factory, worker_id=worker_id, label="worker-1")
    upload_file = tmp_path / "delete-race.wav"
    upload_file.write_bytes(b"audio")
    transcription = await _create_transcription(
        database.session_factory,
        upload_path=str(upload_file),
    )

    entered_event = asyncio.Event()
    release_event = asyncio.Event()
    delayed_factory = _ProxySessionFactory(
        database.session_factory,
        lambda session: _DelayedCommitSession(
            session,
            entered_event=entered_event,
            release_event=release_event,
        ),
    )

    delete_task = asyncio.create_task(
        delete_upload(
            session_factory=delayed_factory,
            transcription_id=transcription.id,
            upload_dir=tmp_path,
        )
    )
    await asyncio.wait_for(entered_event.wait(), timeout=5)

    claim = await claim_next_transcription(
        session_factory=database.session_factory,
        worker_id=worker_id,
        lease_duration_seconds=120,
        now_factory=lambda: datetime(2026, 3, 8, 12, 30, tzinfo=UTC),
    )

    release_event.set()
    await asyncio.wait_for(delete_task, timeout=5)

    assert claim is None
    assert upload_file.exists() is False

    async with database.session_factory() as session:
        deleted_transcription = await session.get(Transcription, transcription.id)
        deleted_artifact = await session.get(TranscriptionArtifact, transcription.id)
        deleted_lease = await session.get(JobLease, transcription.id)
        worker = await session.get(Worker, worker_id)

    assert deleted_transcription is None
    assert deleted_artifact is None
    assert deleted_lease is None
    assert worker.status == WorkerStatus.IDLE
    assert worker.current_transcription_id is None
