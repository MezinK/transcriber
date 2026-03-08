from __future__ import annotations

from collections.abc import Callable
from typing import Protocol
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from infra.models import Transcription, TranscriptionArtifact


class SessionProtocol(Protocol):
    async def execute(self, statement): ...


class SessionContextManager(Protocol):
    async def __aenter__(self) -> SessionProtocol: ...

    async def __aexit__(self, exc_type, exc, tb) -> None: ...


async def list_transcriptions(
    *,
    session_factory: Callable[[], SessionContextManager],
    offset: int,
    limit: int,
) -> tuple[list[Transcription], int]:
    async with session_factory() as session:
        total = (
            await session.execute(select(func.count(Transcription.id)))
        ).scalar_one()
        result = await session.execute(
            select(Transcription)
            .options(joinedload(Transcription.artifact))
            .order_by(Transcription.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = result.unique().scalars().all()
    return items, total


async def get_transcription(
    *,
    session_factory: Callable[[], SessionContextManager],
    transcription_id: uuid.UUID,
) -> Transcription | None:
    async with session_factory() as session:
        result = await session.execute(
            select(Transcription)
            .options(joinedload(Transcription.artifact))
            .where(Transcription.id == transcription_id)
        )
        return result.unique().scalar_one_or_none()


def serialize_transcription(transcription: Transcription) -> dict[str, object]:
    artifact: TranscriptionArtifact | None = transcription.artifact
    return {
        "id": transcription.id,
        "source_filename": transcription.source_filename,
        "media_type": transcription.media_type,
        "status": transcription.status,
        "attempt_count": transcription.attempt_count,
        "error": transcription.error,
        "created_at": transcription.created_at,
        "updated_at": transcription.updated_at,
        "completed_at": transcription.completed_at,
        "speakers": None if artifact is None else artifact.speakers_json,
        "turns": None if artifact is None else artifact.turns_json,
    }
