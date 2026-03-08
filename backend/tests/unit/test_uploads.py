from pathlib import Path

import pytest

from infra.models import MediaType, Transcription, TranscriptionArtifact
from services import storage, uploads
from services.storage import (
    UploadTooLargeError,
    UploadValidationError,
    detect_media_type,
    sanitize_filename,
)
from services.uploads import DeleteUploadResult, create_upload, delete_upload


class FakeResult:
    def __init__(self, scalar=None):
        self._scalar = scalar

    def scalar_one_or_none(self):
        return self._scalar


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
    def __init__(
        self,
        *,
        scalars: list[object | None] | None = None,
        fail_commit: bool = False,
        fail_refresh: bool = False,
    ):
        self.scalars = list(scalars or [])
        self.fail_commit = fail_commit
        self.fail_refresh = fail_refresh
        self.added: list[object] = []
        self.deleted: list[object] = []

    def add(self, instance: object) -> None:
        self.added.append(instance)

    async def execute(self, statement):
        scalar = self.scalars.pop(0) if self.scalars else None
        return FakeResult(scalar)

    async def delete(self, instance: object) -> None:
        self.deleted.append(instance)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("commit failed")

    async def refresh(self, instance: object) -> None:
        if self.fail_refresh:
            raise RuntimeError("refresh failed")
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
    with pytest.raises(UploadValidationError, match="Unsupported file type"):
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

    with pytest.raises(UploadTooLargeError, match="File too large"):
        await create_upload(
            file=FakeUploadFile([b"a" * 8, b"b" * 8]),
            original_filename="oversized.mp3",
            session_factory=session_factory,
            upload_dir=tmp_path,
            max_upload_bytes=10,
        )

    assert list(tmp_path.iterdir()) == []


@pytest.mark.asyncio
async def test_create_upload_rejects_missing_filename(tmp_path: Path):
    session = FakeSession()
    session_factory = FakeSessionFactory(session)

    with pytest.raises(UploadValidationError, match="Filename is required"):
        await create_upload(
            file=FakeUploadFile([b"payload"]),
            original_filename="",
            session_factory=session_factory,
            upload_dir=tmp_path,
            max_upload_bytes=1024,
        )


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


@pytest.mark.asyncio
async def test_create_upload_cleans_file_when_refresh_fails(tmp_path: Path):
    session = FakeSession(fail_refresh=True)
    session_factory = FakeSessionFactory(session)

    with pytest.raises(RuntimeError, match="refresh failed"):
        await create_upload(
            file=FakeUploadFile([b"payload"]),
            original_filename="episode.webm",
            session_factory=session_factory,
            upload_dir=tmp_path,
            max_upload_bytes=1024,
        )

    assert list(tmp_path.iterdir()) == []


def test_remove_managed_file_skips_paths_outside_upload_root(tmp_path: Path):
    upload_root = tmp_path / "uploads"
    upload_root.mkdir()
    outside_file = tmp_path / "outside.wav"
    outside_file.write_bytes(b"payload")

    removed = storage.remove_managed_file(
        upload_root=upload_root,
        stored_path=outside_file,
    )

    assert removed is False
    assert outside_file.exists() is True


@pytest.mark.asyncio
async def test_delete_upload_uses_managed_cleanup_for_deleted_artifact(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    transcription = Transcription(
        source_filename="meeting.wav",
        media_type=MediaType.AUDIO,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path=str(tmp_path / "managed" / "meeting.wav"),
    )
    transcription.artifact = artifact
    transcription.lease = None

    session = FakeSession(scalars=[transcription])
    removed_calls: list[tuple[Path, Path]] = []

    monkeypatch.setattr(
        uploads,
        "remove_managed_file",
        lambda *, upload_root, stored_path: removed_calls.append(
            (Path(upload_root), Path(stored_path))
        )
        or True,
        raising=False,
    )

    outcome = await delete_upload(
        session_factory=FakeSessionFactory(session),
        transcription_id=transcription.id,
        upload_dir=tmp_path / "managed",
    )

    assert outcome.result == DeleteUploadResult.DELETED
    assert removed_calls == [
        (tmp_path / "managed", Path(artifact.upload_path)),
    ]
    assert session.deleted == [transcription]
