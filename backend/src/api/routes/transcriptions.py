from pathlib import Path
import uuid

from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from api.schemas import TranscriptionListResponse, TranscriptionResponse
from infra.config import get_settings
from infra.db import get_session_factory
from infra.models import Transcription, TranscriptionArtifact
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
    async with session_factory() as session:
        count = (await session.execute(select(func.count(Transcription.id)))).scalar_one()
        result = await session.execute(
            select(Transcription)
            .options(joinedload(Transcription.artifact))
            .order_by(Transcription.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        items = result.unique().scalars().all()

    return TranscriptionListResponse(
        items=[_serialize_transcription(item) for item in items],
        total=count,
    )


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: uuid.UUID) -> TranscriptionResponse:
    session_factory = get_session_factory()
    async with session_factory() as session:
        result = await session.execute(
            select(Transcription)
            .options(joinedload(Transcription.artifact))
            .where(Transcription.id == transcription_id)
        )
        transcription = result.unique().scalar_one_or_none()

    if transcription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcription not found",
        )

    return _serialize_transcription(transcription)


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


def _serialize_transcription(transcription: Transcription) -> TranscriptionResponse:
    artifact: TranscriptionArtifact | None = transcription.artifact
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
        transcript_text=None if artifact is None else artifact.transcript_text,
        segments_json=None if artifact is None else artifact.segments_json,
    )
