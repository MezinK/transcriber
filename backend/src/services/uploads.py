import uuid
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from infra.models import Transcription, TranscriptionArtifact
from infra.ids import generate_uuid
from services.storage import (
    AsyncChunkReader,
    UploadValidationError,
    detect_media_type,
    remove_managed_file,
    remove_file,
    sanitize_filename,
    save_upload_stream,
)


class SessionProtocol(Protocol):
    def add(self, instance: object) -> None: ...

    async def execute(self, statement): ...

    async def delete(self, instance: object) -> None: ...

    async def flush(self) -> None: ...

    async def commit(self) -> None: ...

    async def refresh(self, instance: object) -> None: ...


class SessionContextManager(Protocol):
    async def __aenter__(self) -> SessionProtocol: ...

    async def __aexit__(self, exc_type, exc, tb) -> None: ...


class DeleteUploadResult(str, Enum):
    NOT_FOUND = "not_found"
    LEASED = "leased"
    DELETED = "deleted"


@dataclass(frozen=True, slots=True)
class DeleteUploadOutcome:
    result: DeleteUploadResult
    upload_path: Path | None = None


async def create_upload(
    *,
    file: AsyncChunkReader,
    original_filename: str,
    session_factory: Callable[[], SessionContextManager],
    upload_dir: str | Path,
    max_upload_bytes: int,
) -> Transcription:
    if not original_filename:
        raise UploadValidationError("Filename is required")

    safe_name = sanitize_filename(original_filename)
    media_type = detect_media_type(safe_name)

    file_id = generate_uuid()
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
            await session.flush()
            await session.refresh(transcription)
            await session.commit()
    except Exception:
        remove_file(file_path)
        raise

    return transcription


async def delete_upload(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
    upload_dir: str | Path,
) -> DeleteUploadOutcome:
    file_path: Path | None = None

    async with session_factory() as session:
        result = await session.execute(
            select(Transcription)
            .options(
                selectinload(Transcription.artifact),
                selectinload(Transcription.lease),
            )
            .where(Transcription.id == transcription_id)
            .with_for_update()
        )
        transcription = result.scalar_one_or_none()
        if transcription is None:
            return DeleteUploadOutcome(DeleteUploadResult.NOT_FOUND)
        if transcription.lease is not None:
            return DeleteUploadOutcome(DeleteUploadResult.LEASED)

        if transcription.artifact is not None:
            file_path = Path(transcription.artifact.upload_path)

        await session.delete(transcription)
        await session.commit()

    if file_path is not None:
        remove_managed_file(
            upload_root=Path(upload_dir),
            stored_path=file_path,
        )
    return DeleteUploadOutcome(
        result=DeleteUploadResult.DELETED,
        upload_path=file_path,
    )
