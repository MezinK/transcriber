from datetime import UTC, datetime
import uuid

import pytest

from infra.models import (
    JobLease,
    MediaType,
    Transcription,
    TranscriptionArtifact,
    TranscriptionStatus,
)
from services.speakers import (
    SpeakerNotFoundError,
    SpeakerRenameConflictError,
    rename_transcription_speaker,
)


class FakeResult:
    def __init__(self, scalar):
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar


class FakeSession:
    def __init__(self, transcription):
        self.transcription = transcription
        self.committed = False
        self.refreshed = False

    async def execute(self, statement):
        return FakeResult(self.transcription)

    async def commit(self):
        self.committed = True

    async def refresh(self, instance):
        self.refreshed = True


class FakeSessionFactory:
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self.session

    async def __aexit__(self, exc_type, exc, tb):
        return None

    def __call__(self):
        return self


def build_transcription(*, status=TranscriptionStatus.COMPLETED, leased=False):
    transcription = Transcription(
        id=uuid.uuid4(),
        source_filename="meeting.wav",
        media_type=MediaType.AUDIO,
        status=status,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path="/tmp/meeting.wav",
        speakers_json=[{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
        turns_json=[{"speaker_key": "speaker_0", "start": 0.0, "end": 1.0, "text": "Hello"}],
    )
    transcription.artifact = artifact
    if leased:
        transcription.lease = JobLease(
            transcription_id=transcription.id,
            worker_id=uuid.uuid4(),
            leased_until=datetime(2026, 3, 8, 12, 0, tzinfo=UTC),
            heartbeat_at=datetime(2026, 3, 8, 12, 0, tzinfo=UTC),
            attempt=1,
        )
    else:
        transcription.lease = None
    return transcription


@pytest.mark.asyncio
async def test_rename_transcription_speaker_updates_display_name():
    transcription = build_transcription()
    session = FakeSession(transcription)

    updated = await rename_transcription_speaker(
        session_factory=FakeSessionFactory(session),
        transcription_id=transcription.id,
        speaker_key="speaker_0",
        display_name="Alice",
    )

    assert updated.artifact.speakers_json == [
        {"speaker_key": "speaker_0", "display_name": "Alice"}
    ]
    assert session.committed is True
    assert session.refreshed is True


@pytest.mark.asyncio
async def test_rename_transcription_speaker_rejects_unknown_speaker():
    transcription = build_transcription()
    session = FakeSession(transcription)

    with pytest.raises(SpeakerNotFoundError):
        await rename_transcription_speaker(
            session_factory=FakeSessionFactory(session),
            transcription_id=transcription.id,
            speaker_key="speaker_99",
            display_name="Alice",
        )


@pytest.mark.asyncio
async def test_rename_transcription_speaker_rejects_processing_transcription():
    transcription = build_transcription(status=TranscriptionStatus.PROCESSING, leased=True)
    session = FakeSession(transcription)

    with pytest.raises(SpeakerRenameConflictError):
        await rename_transcription_speaker(
            session_factory=FakeSessionFactory(session),
            transcription_id=transcription.id,
            speaker_key="speaker_0",
            display_name="Alice",
        )
