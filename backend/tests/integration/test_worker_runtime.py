from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import asyncio
import threading
import time
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
from services.jobs import recover_stale_leases
from worker import main as worker_main
from worker.main import WorkerRuntime
from worker.pipeline import PipelineStageError
from worker.pipeline_types import Segment, TranscriptArtifacts, Word


async def _seed_transcription(session_factory, tmp_path: Path) -> tuple[uuid.UUID, Path]:
    upload_path = tmp_path / f"{uuid.uuid4()}.wav"
    upload_path.write_bytes(b"payload")

    async with session_factory() as session:
        async with session.begin():
            transcription = Transcription(
                source_filename="meeting.wav",
                media_type=MediaType.AUDIO,
            )
            artifact = TranscriptionArtifact(
                transcription=transcription,
                upload_path=str(upload_path),
            )
            session.add(transcription)
            session.add(artifact)
        return transcription.id, upload_path


async def _seed_stale_processing_transcription(
    session_factory,
    tmp_path: Path,
    *,
    worker_id: uuid.UUID,
    now: datetime,
) -> tuple[uuid.UUID, Path]:
    upload_path = tmp_path / f"{uuid.uuid4()}-stale.wav"
    upload_path.write_bytes(b"stale")

    async with session_factory() as session:
        async with session.begin():
            transcription = Transcription(
                source_filename="stale.wav",
                media_type=MediaType.AUDIO,
                status=TranscriptionStatus.PROCESSING,
                attempt_count=1,
            )
            artifact = TranscriptionArtifact(
                transcription=transcription,
                upload_path=str(upload_path),
            )
            worker = Worker(
                id=worker_id,
                label="stale-worker",
                status=WorkerStatus.PROCESSING,
            )
            lease = JobLease(
                transcription=transcription,
                worker_id=worker_id,
                leased_until=now - timedelta(minutes=1),
                heartbeat_at=now - timedelta(minutes=2),
                attempt=1,
            )
            session.add_all([transcription, artifact, worker, lease])
        return transcription.id, upload_path


async def _seed_stale_idle_worker(
    session_factory,
    *,
    worker_id: uuid.UUID,
    now: datetime,
) -> None:
    async with session_factory() as session:
        async with session.begin():
            worker = Worker(
                id=worker_id,
                label="stale-idle-worker",
                status=WorkerStatus.IDLE,
                started_at=now - timedelta(minutes=10),
                last_heartbeat=now - timedelta(minutes=10),
            )
            session.add(worker)


async def _wait_for(predicate, timeout_seconds: float = 5.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if predicate():
            return
        await asyncio.sleep(0.05)
    raise AssertionError("Timed out waiting for condition")


class SuccessfulPipeline:
    def __init__(self, text: str = "done") -> None:
        self.text = text

    def run(self, file_path: str) -> TranscriptArtifacts:
        return TranscriptArtifacts(
            language="en",
            segments=[
                Segment(
                    start=0.0,
                    end=1.0,
                    text=self.text,
                    speaker="speaker_0",
                    words=[
                        Word(
                            word=self.text,
                            start=0.0,
                            end=1.0,
                            speaker="speaker_0",
                        )
                    ],
                )
            ],
            speakers=[{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
            turns=[
                {
                    "speaker_key": "speaker_0",
                    "start": 0.0,
                    "end": 1.0,
                    "text": self.text,
                }
            ],
        )


class FailingPipeline:
    def run(self, file_path: str) -> TranscriptArtifacts:
        raise PipelineStageError("transcribe", RuntimeError("engine blew up"))


class BlockingPipeline:
    def __init__(self) -> None:
        self.started = threading.Event()
        self.release = threading.Event()

    def run(self, file_path: str) -> TranscriptArtifacts:
        self.started.set()
        self.release.wait(timeout=10)
        return TranscriptArtifacts(
            language="en",
            segments=[
                Segment(
                    start=0.0,
                    end=1.0,
                    text="blocked",
                    speaker="unknown",
                    words=[],
                )
            ],
            speakers=[
                {"speaker_key": "unknown", "display_name": "Unknown Speaker"}
            ],
            turns=[
                {
                    "speaker_key": "unknown",
                    "start": 0.0,
                    "end": 1.0,
                    "text": "blocked",
                }
            ],
        )


@pytest.mark.asyncio
async def test_worker_claims_a_pending_job(database, tmp_path: Path):
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    pipeline = BlockingPipeline()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=pipeline,
        heartbeat_interval_seconds=5.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
        now_factory=lambda: datetime(2026, 3, 8, 16, 0, tzinfo=UTC),
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(pipeline.started.is_set)

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert transcription.status == TranscriptionStatus.PROCESSING
    assert lease is not None
    assert worker.status == WorkerStatus.PROCESSING
    assert worker.current_transcription_id == transcription_id

    pipeline.release.set()
    await task
    await runtime.close()


@pytest.mark.asyncio
async def test_heartbeat_renews_lease_during_work(
    database,
    tmp_path: Path,
):
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    pipeline = BlockingPipeline()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=pipeline,
        heartbeat_interval_seconds=0.1,
        lease_duration_seconds=1,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(pipeline.started.is_set)

    async with database.session_factory() as session:
        first_lease = await session.get(JobLease, transcription_id)
        first_expiry = first_lease.leased_until

    await asyncio.sleep(0.25)

    async with database.session_factory() as session:
        renewed_lease = await session.get(JobLease, transcription_id)

    assert renewed_lease.leased_until > first_expiry

    pipeline.release.set()
    await task
    await runtime.close()


@pytest.mark.asyncio
async def test_completion_writes_results_and_clears_lease(
    database,
    tmp_path: Path,
):
    transcription_id, upload_path = await _seed_transcription(
        database.session_factory, tmp_path
    )
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=SuccessfulPipeline("final text"),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
    )

    processed = await runtime.run_once()

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert processed is True
    assert transcription.status == TranscriptionStatus.COMPLETED
    assert artifact.speakers_json == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
    ]
    assert artifact.turns_json == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 1.0,
            "text": "final text",
        }
    ]
    assert lease is None
    assert worker.status == WorkerStatus.IDLE
    assert upload_path.exists() is False
    await runtime.close()


@pytest.mark.asyncio
async def test_failure_requeues_with_incremented_attempt_count(
    database,
    tmp_path: Path,
):
    transcription_id, upload_path = await _seed_transcription(
        database.session_factory, tmp_path
    )
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=FailingPipeline(),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
        max_attempts=3,
    )

    processed = await runtime.run_once()

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)

    assert processed is True
    assert transcription.status == TranscriptionStatus.PENDING
    assert transcription.attempt_count == 1
    assert transcription.error == "pipeline.transcribe: RuntimeError: engine blew up"
    assert lease is None
    assert upload_path.exists() is True
    await runtime.close()


@pytest.mark.asyncio
async def test_shutdown_preserves_recoverable_state(
    database,
    tmp_path: Path,
):
    now = datetime(2026, 3, 8, 16, 30, tzinfo=UTC)
    transcription_id, _ = await _seed_transcription(database.session_factory, tmp_path)
    pipeline = BlockingPipeline()
    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=pipeline,
        heartbeat_interval_seconds=10.0,
        lease_duration_seconds=1,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
        now_factory=lambda: now,
    )

    task = asyncio.create_task(runtime.run_once())
    await _wait_for(pipeline.started.is_set)
    assert runtime.current_claim is not None

    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    pipeline.release.set()
    await asyncio.sleep(0.1)

    async with database.session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)
        worker = await session.get(Worker, runtime.worker_id)

    assert transcription.status == TranscriptionStatus.PROCESSING
    assert lease is not None
    assert worker.current_transcription_id == transcription_id

    summary = await recover_stale_leases(
        session_factory=database.session_factory,
        max_attempts=3,
        upload_dir=tmp_path,
        now_factory=lambda: now + timedelta(minutes=5),
    )

    async with database.session_factory() as session:
        recovered = await session.get(Transcription, transcription_id)
        recovered_lease = await session.get(JobLease, transcription_id)

    assert summary.requeued_ids == (transcription_id,)
    assert recovered.status == TranscriptionStatus.PENDING
    assert recovered_lease is None
    await runtime.close()


@pytest.mark.asyncio
async def test_run_recovers_stale_leases_during_busy_iterations(
    database,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    now = datetime(2026, 3, 8, 17, 0, tzinfo=UTC)
    stale_worker_id = uuid.uuid4()
    stale_transcription_id, _ = await _seed_stale_processing_transcription(
        database.session_factory,
        tmp_path,
        worker_id=stale_worker_id,
        now=now,
    )
    pending_transcription_id, _ = await _seed_transcription(
        database.session_factory,
        tmp_path,
    )

    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=SuccessfulPipeline("busy pass"),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
        max_attempts=3,
        now_factory=lambda: now,
    )

    original_complete = worker_main.complete_transcription

    async def complete_and_stop(*args, **kwargs):
        await original_complete(*args, **kwargs)
        runtime.request_shutdown()

    monkeypatch.setattr(worker_main, "complete_transcription", complete_and_stop)

    await asyncio.wait_for(runtime.run(), timeout=5)

    async with database.session_factory() as session:
        pending = await session.get(Transcription, pending_transcription_id)
        stale = await session.get(Transcription, stale_transcription_id)
        stale_lease = await session.get(JobLease, stale_transcription_id)
        stale_worker = await session.get(Worker, stale_worker_id)

    assert pending.status == TranscriptionStatus.COMPLETED
    assert stale.status == TranscriptionStatus.PENDING
    assert stale.error == "Lease expired; job returned to queue"
    assert stale_lease is None
    assert stale_worker.status == WorkerStatus.STALE
    await runtime.close()


@pytest.mark.asyncio
async def test_run_prunes_stale_inactive_workers(
    database,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    now = datetime(2026, 3, 8, 18, 0, tzinfo=UTC)
    stale_worker_id = uuid.uuid4()
    await _seed_stale_idle_worker(
        database.session_factory,
        worker_id=stale_worker_id,
        now=now,
    )
    await _seed_transcription(database.session_factory, tmp_path)

    runtime = WorkerRuntime(
        session_factory=database.session_factory,
        pipeline=SuccessfulPipeline("cleanup pass"),
        heartbeat_interval_seconds=1.0,
        lease_duration_seconds=30,
        poll_interval_seconds=1.0,
        upload_dir=str(tmp_path),
        max_attempts=3,
        now_factory=lambda: now,
    )

    original_complete = worker_main.complete_transcription

    async def complete_and_stop(*args, **kwargs):
        await original_complete(*args, **kwargs)
        runtime.request_shutdown()

    monkeypatch.setattr(worker_main, "complete_transcription", complete_and_stop)

    await asyncio.wait_for(runtime.run(), timeout=5)

    async with database.session_factory() as session:
        stale_worker = await session.get(Worker, stale_worker_id)

    assert stale_worker is None
    await runtime.close()
