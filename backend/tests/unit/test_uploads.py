from collections.abc import AsyncIterator
from pathlib import Path

import pytest

from infra.models import MediaType, Transcription, TranscriptionArtifact
from services.storage import detect_media_type, sanitize_filename
from services.uploads import create_upload


class FakeUploadFile:
    def __init__(self, chunks: list[bytes]):
        self._chunks = chunks
        self._index = 0

    async def read(self, _: int) -> bytes:
        if self._index >= len(self._chunks):
            return b""
        chunk = self._chunks[self._index]
        self._index += 1
        return chunk


class FakeSession:
    def __init__(self, *, fail_commit: bool = False):
        self.fail_commit = fail_commit
        self.added: list[object] = []

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("commit failed")

    async def refresh(self, instance: object) -> None:
        return None


class FakeSessionFactory:
    def __init__(self, session: FakeSession):
        self.session = session

    async def __aenter__(self) -> FakeSession:
        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None

    def __call__(self) -> "FakeSessionFactory":
        return self


def test_sanitize_filename_preserves_extension_and_sanitizes_stem():
    assert sanitize_filename("../bad name?.WAV") == "bad_name_.wav"


def test_detect_media_type_rejects_unsupported_extension():
    with pytest.raises(ValueError, match="Unsupported file type"):
        detect_media_type("notes.txt")


@pytest.mark.asyncio
async def test_create_upload_streams_to_disk_and_creates_records(tmp_path: Path):
    session = FakeSession()
    session_factory = FakeSessionFactory(session)

    transcription = await create_upload(
        file=FakeUploadFile([b"hello ", b"world"]),
        original_filename="meeting.wav",
        session_factory=session_factory,
        upload_dir=tmp_path,
        max_upload_bytes=1024,
    )

    assert isinstance(transcription, Transcription)
    assert transcription.source_filename == "meeting.wav"
    assert transcription.media_type == MediaType.AUDIO

    artifact = next(
        item for item in session.added if isinstance(item, TranscriptionArtifact)
    )
    assert Path(artifact.upload_path).read_bytes() == b"hello world"
    assert artifact.transcription is transcription


@pytest.mark.asyncio
async def test_create_upload_cleans_partial_file_on_size_limit(tmp_path: Path):
    session = FakeSession()
    session_factory = FakeSessionFactory(session)

    with pytest.raises(ValueError, match="File too large"):
        await create_upload(
            file=FakeUploadFile([b"a" * 8, b"b" * 8]),
            original_filename="oversized.mp3",
            session_factory=session_factory,
            upload_dir=tmp_path,
            max_upload_bytes=10,
        )

    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_create_upload_cleans_file_when_commit_fails(tmp_path: Path):
    session = FakeSession(fail_commit=True)
    session_factory = FakeSessionFactory(session)

    with pytest.raises(RuntimeError, match="commit failed"):
        await create_upload(
            file=FakeUploadFile([b"payload"]),
            original_filename="episode.webm",
            session_factory=session_factory,
            upload_dir=tmp_path,
            max_upload_bytes=1024,
        )

    assert list(tmp_path.iterdir()) == []
