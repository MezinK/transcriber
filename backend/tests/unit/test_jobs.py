from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import uuid

import pytest

from infra.models import (
    JobLease,
    MediaType,
    Transcription,
    TranscriptionArtifact,
    TranscriptionStatus,
)
from services import jobs


class FakeResult:
    def __init__(self, scalar=None):
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar

    def scalars(self):
        return [] if self._scalar is None else self._scalar


class FakeSession:
    def __init__(self, *, scalars: list[object | None] | None = None, fail_commit: bool = False):
        self.scalars = list(scalars or [])
        self.fail_commit = fail_commit
        self.added: list[object] = []
        self.executed: list[object] = []
        self.committed = False

    async def execute(self, statement):
        self.executed.append(statement)
        scalar = self.scalars.pop(0) if self.scalars else None
        return FakeResult(scalar)

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("commit failed")
        self.committed = True


class FakeSessionFactory:
    def __init__(self, session: FakeSession):
        self.session = session

    async def __aenter__(self) -> FakeSession:
        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    def __call__(self) -> "FakeSessionFactory":
        return self


def build_transcription(*, attempt_count: int = 0) -> tuple[Transcription, TranscriptionArtifact]:
    transcription = Transcription(
        id=uuid.uuid4(),
        source_filename="meeting.wav",
        media_type=MediaType.AUDIO,
        status=TranscriptionStatus.PENDING,
        attempt_count=attempt_count,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path="/tmp/meeting.wav",
    )
    return transcription, artifact


def build_lease(
    *,
    worker_id: uuid.UUID,
    attempt: int = 1,
) -> tuple[JobLease, Transcription, TranscriptionArtifact]:
    transcription, artifact = build_transcription(attempt_count=attempt)
    lease = JobLease(
        transcription_id=transcription.id,
        worker_id=worker_id,
        leased_until=datetime(2026, 3, 8, 10, 2, tzinfo=UTC),
        heartbeat_at=datetime(2026, 3, 8, 10, 0, tzinfo=UTC),
        attempt=attempt,
    )
    lease.transcription = transcription
    transcription.lease = lease
    transcription.artifact = artifact
    return lease, transcription, artifact


@pytest.mark.asyncio
async def test_claim_next_transcription_claims_pending_job():
    worker_id = uuid.uuid4()
    now = datetime(2026, 3, 8, 10, 0, tzinfo=UTC)
    transcription, artifact = build_transcription()
    session = FakeSession(scalars=[transcription, None])

    claimed = await jobs.claim_next_transcription(
        session_factory=FakeSessionFactory(session),
        worker_id=worker_id,
        lease_duration_seconds=120,
        now_factory=lambda: now,
    )

    assert claimed is not None
    assert claimed.transcription_id == transcription.id
    assert claimed.upload_path == artifact.upload_path
    assert claimed.attempt == 1
    assert transcription.status == TranscriptionStatus.PROCESSING
    assert transcription.attempt_count == 1
    assert len(session.added) == 1
    lease = session.added[0]
    assert isinstance(lease, JobLease)
    assert lease.worker_id == worker_id
    assert lease.leased_until == datetime(2026, 3, 8, 10, 2, tzinfo=UTC)
    assert session.committed is True


@pytest.mark.asyncio
async def test_claim_next_transcription_returns_none_when_no_job_is_available():
    session = FakeSession(scalars=[None])

    claimed = await jobs.claim_next_transcription(
        session_factory=FakeSessionFactory(session),
        worker_id=uuid.uuid4(),
        lease_duration_seconds=120,
    )

    assert claimed is None
    assert session.added == []
    assert session.committed is False


@pytest.mark.asyncio
async def test_renew_lease_updates_heartbeat(monkeypatch: pytest.MonkeyPatch):
    worker_id = uuid.uuid4()
    lease, _, _ = build_lease(worker_id=worker_id)
    session = FakeSession()
    now = datetime(2026, 3, 8, 10, 5, tzinfo=UTC)
    updated_workers: list[dict[str, object]] = []

    async def fake_get_owned_lease(*args, **kwargs):
        return lease

    async def fake_update_worker(*args, **kwargs):
        updated_workers.append(kwargs)

    monkeypatch.setattr(jobs, "_get_owned_lease", fake_get_owned_lease)
    monkeypatch.setattr(jobs, "_update_worker", fake_update_worker)

    state = await jobs.renew_lease(
        session_factory=FakeSessionFactory(session),
        transcription_id=lease.transcription_id,
        worker_id=worker_id,
        lease_duration_seconds=90,
        now_factory=lambda: now,
    )

    assert state.heartbeat_at == now
    assert state.leased_until == datetime(2026, 3, 8, 10, 6, 30, tzinfo=UTC)
    assert updated_workers[0]["status"].value == "processing"
    assert session.committed is True


@pytest.mark.asyncio
async def test_complete_transcription_writes_artifacts_and_cleans_up_after_commit(
    monkeypatch: pytest.MonkeyPatch,
):
    worker_id = uuid.uuid4()
    lease, transcription, artifact = build_lease(worker_id=worker_id)
    session = FakeSession()
    removed_paths: list[tuple[Path, Path]] = []
    now = datetime(2026, 3, 8, 10, 7, tzinfo=UTC)

    async def fake_get_owned_lease(*args, **kwargs):
        return lease

    async def fake_update_worker(*args, **kwargs):
        return None

    monkeypatch.setattr(jobs, "_get_owned_lease", fake_get_owned_lease)
    monkeypatch.setattr(jobs, "_update_worker", fake_update_worker)
    monkeypatch.setattr(
        jobs,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_paths.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    await jobs.complete_transcription(
        session_factory=FakeSessionFactory(session),
        transcription_id=transcription.id,
        worker_id=worker_id,
        transcript_text="hello world",
        segments_json={"segments": [{"text": "hello world"}]},
        upload_dir="/tmp/uploads",
        now_factory=lambda: now,
    )

    assert transcription.status == TranscriptionStatus.COMPLETED
    assert transcription.completed_at == now
    assert artifact.transcript_text == "hello world"
    assert artifact.segments_json == {"segments": [{"text": "hello world"}]}
    assert removed_paths == [(Path("/tmp/uploads"), Path(artifact.upload_path))]


@pytest.mark.asyncio
async def test_fail_transcription_requeues_retryable_jobs(
    monkeypatch: pytest.MonkeyPatch,
):
    worker_id = uuid.uuid4()
    lease, transcription, _ = build_lease(worker_id=worker_id, attempt=1)
    session = FakeSession()
    removed_paths: list[tuple[Path, Path]] = []

    async def fake_get_owned_lease(*args, **kwargs):
        return lease

    async def fake_update_worker(*args, **kwargs):
        return None

    monkeypatch.setattr(jobs, "_get_owned_lease", fake_get_owned_lease)
    monkeypatch.setattr(jobs, "_update_worker", fake_update_worker)
    monkeypatch.setattr(
        jobs,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_paths.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    status = await jobs.fail_transcription(
        session_factory=FakeSessionFactory(session),
        transcription_id=transcription.id,
        worker_id=worker_id,
        error="temporary issue",
        max_attempts=3,
        upload_dir="/tmp/uploads",
    )

    assert status == TranscriptionStatus.PENDING
    assert transcription.status == TranscriptionStatus.PENDING
    assert transcription.error == "temporary issue"
    assert removed_paths == []


@pytest.mark.asyncio
async def test_fail_transcription_marks_final_failure_and_cleans_up_after_commit(
    monkeypatch: pytest.MonkeyPatch,
):
    worker_id = uuid.uuid4()
    lease, transcription, artifact = build_lease(worker_id=worker_id, attempt=3)
    session = FakeSession()
    removed_paths: list[tuple[Path, Path]] = []

    async def fake_get_owned_lease(*args, **kwargs):
        return lease

    async def fake_update_worker(*args, **kwargs):
        return None

    monkeypatch.setattr(jobs, "_get_owned_lease", fake_get_owned_lease)
    monkeypatch.setattr(jobs, "_update_worker", fake_update_worker)
    monkeypatch.setattr(
        jobs,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_paths.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    status = await jobs.fail_transcription(
        session_factory=FakeSessionFactory(session),
        transcription_id=transcription.id,
        worker_id=worker_id,
        error="permanent issue",
        max_attempts=3,
        upload_dir="/tmp/uploads",
    )

    assert status == TranscriptionStatus.FAILED
    assert transcription.status == TranscriptionStatus.FAILED
    assert transcription.error == "permanent issue"
    assert removed_paths == [(Path("/tmp/uploads"), Path(artifact.upload_path))]


@pytest.mark.asyncio
async def test_complete_transcription_does_not_cleanup_when_commit_fails(
    monkeypatch: pytest.MonkeyPatch,
):
    worker_id = uuid.uuid4()
    lease, transcription, artifact = build_lease(worker_id=worker_id)
    session = FakeSession(fail_commit=True)
    removed_paths: list[tuple[Path, Path]] = []

    async def fake_get_owned_lease(*args, **kwargs):
        return lease

    async def fake_update_worker(*args, **kwargs):
        return None

    monkeypatch.setattr(jobs, "_get_owned_lease", fake_get_owned_lease)
    monkeypatch.setattr(jobs, "_update_worker", fake_update_worker)
    monkeypatch.setattr(
        jobs,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_paths.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    with pytest.raises(RuntimeError, match="commit failed"):
        await jobs.complete_transcription(
            session_factory=FakeSessionFactory(session),
            transcription_id=transcription.id,
            worker_id=worker_id,
            transcript_text="hello world",
            segments_json=None,
            upload_dir="/tmp/uploads",
        )

    assert transcription.status == TranscriptionStatus.COMPLETED
    assert artifact.transcript_text == "hello world"
    assert removed_paths == []


@pytest.mark.asyncio
async def test_recover_stale_leases_uses_managed_cleanup_for_failed_jobs(
    monkeypatch: pytest.MonkeyPatch,
):
    worker_id = uuid.uuid4()
    stale_lease, stale_transcription, stale_artifact = build_lease(
        worker_id=worker_id,
        attempt=2,
    )
    stale_transcription.status = TranscriptionStatus.PROCESSING
    session = FakeSession(scalars=[[stale_lease]])
    removed_paths: list[tuple[Path, Path]] = []
    now = datetime(2026, 3, 8, 10, 7, tzinfo=UTC)

    monkeypatch.setattr(
        jobs,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_paths.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    summary = await jobs.recover_stale_leases(
        session_factory=FakeSessionFactory(session),
        max_attempts=2,
        upload_dir="/tmp/uploads",
        now_factory=lambda: now,
    )

    assert summary.failed_ids == (stale_lease.transcription_id,)
    assert summary.requeued_ids == ()
    assert removed_paths == [(Path("/tmp/uploads"), Path(stale_artifact.upload_path))]
