from collections.abc import AsyncGenerator
from datetime import timedelta
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from infra.models import Base, MediaType, Transcription, Worker, WorkerStatus
from infra.time import utc_now
from services.workers import (
    cleanup_stale_workers,
    clear_worker_current_job,
    heartbeat_worker,
    list_workers,
    register_worker,
    set_worker_current_job,
)


@pytest_asyncio.fixture
async def session_factory(tmp_path) -> AsyncGenerator:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path}/workers.sqlite3")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_register_worker_for_ui(session_factory):
    worker_id = uuid.uuid4()

    snapshot = await register_worker(
        session_factory=session_factory,
        worker_id=worker_id,
        label="local-worker",
    )

    assert snapshot.id == worker_id
    assert snapshot.label == "local-worker"
    assert snapshot.status == WorkerStatus.IDLE


@pytest.mark.asyncio
async def test_set_worker_processing_state(session_factory):
    worker_id = uuid.uuid4()
    transcription_id = await _seed_transcription(session_factory)
    await register_worker(session_factory=session_factory, worker_id=worker_id)

    assert await set_worker_current_job(
        session_factory=session_factory,
        worker_id=worker_id,
        transcription_id=transcription_id,
    )

    async with session_factory() as session:
        worker = await session.get(Worker, worker_id)
        assert worker.status == WorkerStatus.PROCESSING
        assert worker.current_transcription_id == transcription_id


@pytest.mark.asyncio
async def test_mark_worker_idle_after_completion(session_factory):
    worker_id = uuid.uuid4()
    transcription_id = await _seed_transcription(session_factory)
    await register_worker(session_factory=session_factory, worker_id=worker_id)
    await set_worker_current_job(
        session_factory=session_factory,
        worker_id=worker_id,
        transcription_id=transcription_id,
    )

    assert await clear_worker_current_job(
        session_factory=session_factory,
        worker_id=worker_id,
    )

    async with session_factory() as session:
        worker = await session.get(Worker, worker_id)
        assert worker.status == WorkerStatus.IDLE
        assert worker.current_transcription_id is None


@pytest.mark.asyncio
async def test_mark_worker_stale_based_on_heartbeat_age(session_factory):
    worker_id = uuid.uuid4()
    now = utc_now()
    await register_worker(
        session_factory=session_factory,
        worker_id=worker_id,
        now=lambda: now - timedelta(minutes=5),
    )

    workers = await list_workers(
        session_factory=session_factory,
        stale_after_seconds=30,
        now=lambda: now,
    )

    assert len(workers) == 1
    assert workers[0].status == WorkerStatus.STALE


@pytest.mark.asyncio
async def test_cleanup_stale_workers_removes_inactive_stale_rows(session_factory):
    stale_worker = uuid.uuid4()
    active_worker = uuid.uuid4()
    processing_worker = uuid.uuid4()
    transcription_id = await _seed_transcription(session_factory)
    now = utc_now()

    async with session_factory() as session:
        async with session.begin():
            session.add(
                Worker(
                    id=stale_worker,
                    status=WorkerStatus.IDLE,
                    started_at=now - timedelta(minutes=5),
                    last_heartbeat=now - timedelta(minutes=5),
                )
            )
            session.add(
                Worker(
                    id=active_worker,
                    status=WorkerStatus.IDLE,
                    started_at=now,
                    last_heartbeat=now,
                )
            )
            session.add(
                Worker(
                    id=processing_worker,
                    status=WorkerStatus.PROCESSING,
                    started_at=now - timedelta(minutes=5),
                    last_heartbeat=now - timedelta(minutes=5),
                    current_transcription_id=transcription_id,
                )
            )

    deleted = await cleanup_stale_workers(
        session_factory=session_factory,
        prune_after_seconds=30,
        now=lambda: now,
    )

    async with session_factory() as session:
        stale = await session.get(Worker, stale_worker)
        active = await session.get(Worker, active_worker)
        processing = await session.get(Worker, processing_worker)

    assert deleted == 1
    assert stale is None
    assert active is not None
    assert processing is not None


@pytest.mark.asyncio
async def test_cleanup_stale_workers_keeps_recently_stale_rows(session_factory):
    worker_id = uuid.uuid4()
    now = utc_now()

    async with session_factory() as session:
        async with session.begin():
            session.add(
                Worker(
                    id=worker_id,
                    status=WorkerStatus.IDLE,
                    started_at=now - timedelta(minutes=5),
                    last_heartbeat=now - timedelta(minutes=5),
                )
            )

    deleted = await cleanup_stale_workers(
        session_factory=session_factory,
        prune_after_seconds=300,
        now=lambda: now,
    )

    async with session_factory() as session:
        worker = await session.get(Worker, worker_id)

    assert deleted == 0
    assert worker is not None


@pytest.mark.asyncio
async def test_list_workers_sorted_for_ui_consumption(session_factory):
    newer_worker = uuid.uuid4()
    older_worker = uuid.uuid4()
    now = utc_now()
    await register_worker(
        session_factory=session_factory,
        worker_id=older_worker,
        label="older",
        now=lambda: now - timedelta(minutes=2),
    )
    await register_worker(
        session_factory=session_factory,
        worker_id=newer_worker,
        label="newer",
        now=lambda: now,
    )
    assert await heartbeat_worker(
        session_factory=session_factory,
        worker_id=older_worker,
        now=lambda: now,
    )

    workers = await list_workers(
        session_factory=session_factory,
        stale_after_seconds=120,
        now=lambda: now,
    )

    assert [worker.id for worker in workers] == [newer_worker, older_worker]


async def _seed_transcription(session_factory) -> uuid.UUID:
    async with session_factory() as session:
        async with session.begin():
            transcription = Transcription(
                source_filename="worker.wav",
                media_type=MediaType.AUDIO,
            )
            session.add(transcription)
        return transcription.id
