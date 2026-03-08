import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from infra.models import Transcription, TranscriptionArtifact
from services.storage import (
    AsyncChunkReader,
    detect_media_type,
    remove_file,
    sanitize_filename,
    save_upload_stream,
)


class SessionProtocol(Protocol):
    def add(self, instance: object) -> None: ...

    async def commit(self) -> None: ...

    async def refresh(self, instance: object) -> None: ...


class SessionContextManager(Protocol):
    async def __aenter__(self) -> SessionProtocol: ...

    async def __aexit__(self, exc_type, exc, tb) -> None: ...


async def create_upload(
    *,
    file: AsyncChunkReader,
    original_filename: str,
    session_factory: Callable[[], SessionContextManager],
    upload_dir: str | Path,
    max_upload_bytes: int,
) -> Transcription:
    if not original_filename:
        raise ValueError("Filename is required")

    safe_name = sanitize_filename(original_filename)
    media_type = detect_media_type(safe_name)

    file_id = uuid.uuid7()
    stored_name = f"{file_id}{Path(safe_name).suffix}"
    file_path = Path(upload_dir) / stored_name

    try:
        await save_upload_stream(
            file,
            file_path,
            max_upload_bytes=max_upload_bytes,
        )
    except Exception:
        remove_file(file_path)
        raise

    transcription = Transcription(
        source_filename=safe_name,
        media_type=media_type,
    )
    artifact = TranscriptionArtifact(
        transcription=transcription,
        upload_path=str(file_path),
    )

    try:
        async with session_factory() as session:
            session.add(transcription)
            session.add(artifact)
            await session.commit()
            await session.refresh(transcription)
    except Exception:
        remove_file(file_path)
        raise

    return transcription
