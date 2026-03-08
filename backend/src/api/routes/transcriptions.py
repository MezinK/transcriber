from pathlib import Path
import uuid

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status

from api.schemas import (
    RenameSpeakerRequest,
    TranscriptionListResponse,
    TranscriptionResponse,
)
from infra.config import get_settings
from infra.db import get_session_factory
from services.speakers import (
    SpeakerNotFoundError,
    SpeakerRenameConflictError,
    TranscriptionNotFoundError,
    rename_transcription_speaker,
)
from services.transcriptions import (
    get_transcription as fetch_transcription,
    list_transcriptions as fetch_transcriptions,
    serialize_transcription,
)
from services.storage import UploadTooLargeError, UploadValidationError
from services.uploads import DeleteUploadResult, create_upload, delete_upload

router = APIRouter()


@router.post("/", response_model=TranscriptionResponse, status_code=status.HTTP_201_CREATED)
async def upload_transcription(file: UploadFile = File(...)) -> TranscriptionResponse:
    settings = get_settings()
    try:
        transcription = await create_upload(
            file=file,
            original_filename=file.filename or "",
            session_factory=get_session_factory(),
            upload_dir=Path(settings.upload_dir),
            max_upload_bytes=settings.max_upload_bytes,
        )
    except UploadTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=str(exc),
        ) from exc
    except UploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return TranscriptionResponse(
        id=transcription.id,
        source_filename=transcription.source_filename,
        media_type=transcription.media_type,
        status=transcription.status,
        attempt_count=transcription.attempt_count,
        error=transcription.error,
        created_at=transcription.created_at,
        updated_at=transcription.updated_at,
        completed_at=transcription.completed_at,
    )


@router.get("/", response_model=TranscriptionListResponse)
async def list_transcriptions(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> TranscriptionListResponse:
    session_factory = get_session_factory()
    items, total = await fetch_transcriptions(
        session_factory=session_factory,
        offset=offset,
        limit=limit,
    )

    return TranscriptionListResponse(
        items=[TranscriptionResponse(**serialize_transcription(item)) for item in items],
        total=total,
    )


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: uuid.UUID) -> TranscriptionResponse:
    session_factory = get_session_factory()
    transcription = await fetch_transcription(
        session_factory=session_factory,
        transcription_id=transcription_id,
    )

    if transcription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcription not found",
        )

    return TranscriptionResponse(**serialize_transcription(transcription))


@router.delete("/{transcription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transcription_route(transcription_id: uuid.UUID) -> Response:
    session_factory = get_session_factory()
    outcome = await delete_upload(
        session_factory=session_factory,
        transcription_id=transcription_id,
        upload_dir=Path(get_settings().upload_dir),
    )
    if outcome.result == DeleteUploadResult.LEASED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transcription is currently being processed",
        )
    if outcome.result == DeleteUploadResult.NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcription not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{transcription_id}/speakers/{speaker_key}", response_model=TranscriptionResponse)
async def rename_transcription_speaker_route(
    transcription_id: uuid.UUID,
    speaker_key: str,
    payload: RenameSpeakerRequest,
) -> TranscriptionResponse:
    session_factory = get_session_factory()
    try:
        transcription = await rename_transcription_speaker(
            session_factory=session_factory,
            transcription_id=transcription_id,
            speaker_key=speaker_key,
            display_name=payload.display_name,
        )
    except TranscriptionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcription not found",
        ) from exc
    except SpeakerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaker not found",
        ) from exc
    except SpeakerRenameConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Transcription is currently being processed",
        ) from exc

    return TranscriptionResponse(**serialize_transcription(transcription))
