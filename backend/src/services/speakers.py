from __future__ import annotations

from collections.abc import Callable
import uuid

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from infra.models import Transcription, TranscriptionStatus
from services.transcript_assembly import rename_speaker


class SpeakerServiceError(RuntimeError):
    pass


class SpeakerRenameConflictError(SpeakerServiceError):
    pass


class SpeakerNotFoundError(SpeakerServiceError):
    pass


class TranscriptionNotFoundError(SpeakerServiceError):
    pass


async def rename_transcription_speaker(
    *,
    session_factory: Callable,
    transcription_id: uuid.UUID,
    speaker_key: str,
    display_name: str,
) -> Transcription:
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
        if transcription is None or transcription.artifact is None:
            raise TranscriptionNotFoundError(
                f"Transcription {transcription_id} not found"
            )
        if (
            transcription.status == TranscriptionStatus.PROCESSING
            or transcription.lease is not None
        ):
            raise SpeakerRenameConflictError(
                f"Transcription {transcription_id} is currently being processed"
            )

        speakers = list(transcription.artifact.speakers_json or [])
        if not any(item.get("speaker_key") == speaker_key for item in speakers):
            raise SpeakerNotFoundError(f"Speaker {speaker_key} not found")

        transcription.artifact.speakers_json = rename_speaker(
            speakers=speakers,
            speaker_key=speaker_key,
            display_name=display_name,
        )
        await session.commit()
        await session.refresh(transcription)
        return transcription
