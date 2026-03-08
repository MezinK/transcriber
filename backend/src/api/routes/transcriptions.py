from pathlib import Path
import uuid

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select

from api.schemas import TranscriptionListResponse, TranscriptionResponse
from infra.models import Transcription, TranscriptionArtifact, TranscriptionStatus
from services.jobs import (
    TranscriptionDeletionConflictError,
    ensure_transcription_deletable,
)
from services.storage import remove_file
from services.uploads import create_upload


def build_router(*, session_factory, settings) -> APIRouter:
    router = APIRouter()

    @router.post(
        "/",
        response_model=TranscriptionResponse,
        status_code=status.HTTP_201_CREATED,
    )
    async def create_transcription(file: UploadFile = File(...)):
        try:
            transcription = await create_upload(
                file=file,
                original_filename=file.filename or "",
                session_factory=session_factory,
                upload_dir=settings.upload_dir,
                max_upload_bytes=settings.max_upload_bytes,
            )
        except ValueError as exc:
            error_message = str(exc)
            status_code = (
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                if "File too large" in error_message
                else status.HTTP_400_BAD_REQUEST
            )
            raise HTTPException(status_code=status_code, detail=error_message) from exc

        return await _get_transcription_response(
            session_factory=session_factory,
            transcription_id=transcription.id,
        )

    @router.get("/", response_model=TranscriptionListResponse)
    async def list_transcriptions(
        status_filter: TranscriptionStatus | None = Query(None, alias="status"),
        offset: int = Query(0, ge=0),
        limit: int = Query(20, ge=1, le=100),
    ):
        async with session_factory() as session:
            count_query = select(func.count(Transcription.id))
            items_query = (
                select(Transcription, TranscriptionArtifact)
                .join(TranscriptionArtifact)
                .order_by(Transcription.created_at.desc())
                .offset(offset)
                .limit(limit)
            )

            if status_filter is not None:
                count_query = count_query.where(Transcription.status == status_filter)
                items_query = items_query.where(Transcription.status == status_filter)

            total = (await session.execute(count_query)).scalar_one()
            result = await session.execute(items_query)
            items = [
                _serialize_transcription(transcription, artifact)
                for transcription, artifact in result.all()
            ]

        return TranscriptionListResponse(items=items, total=total)

    @router.get("/{transcription_id}", response_model=TranscriptionResponse)
    async def get_transcription(transcription_id: uuid.UUID):
        response = await _get_transcription_response(
            session_factory=session_factory,
            transcription_id=transcription_id,
        )
        if response is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcription not found")
        return response

    @router.delete("/{transcription_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_transcription(transcription_id: uuid.UUID):
        try:
            await ensure_transcription_deletable(
                session_factory=session_factory,
                transcription_id=transcription_id,
            )
        except TranscriptionDeletionConflictError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Transcription is currently leased",
            ) from exc

        file_path: str | None = None
        async with session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    select(Transcription, TranscriptionArtifact)
                    .join(TranscriptionArtifact)
                    .where(Transcription.id == transcription_id)
                )
                row = result.one_or_none()
                if row is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Transcription not found",
                    )

                transcription, artifact = row
                file_path = artifact.upload_path
                await session.delete(transcription)

        if file_path is not None:
            remove_file(Path(file_path))

    return router


async def _get_transcription_response(
    *,
    session_factory,
    transcription_id: uuid.UUID,
) -> TranscriptionResponse | None:
    async with session_factory() as session:
        result = await session.execute(
            select(Transcription, TranscriptionArtifact)
            .join(TranscriptionArtifact)
            .where(Transcription.id == transcription_id)
        )
        row = result.one_or_none()
        if row is None:
            return None
        transcription, artifact = row
        return _serialize_transcription(transcription, artifact)


def _serialize_transcription(
    transcription: Transcription,
    artifact: TranscriptionArtifact,
) -> TranscriptionResponse:
    return TranscriptionResponse(
        id=transcription.id,
        source_filename=transcription.source_filename,
        media_type=transcription.media_type,
        status=transcription.status,
        attempt_count=transcription.attempt_count,
        error=transcription.error,
        transcript_text=artifact.transcript_text,
        segments_json=artifact.segments_json,
        created_at=transcription.created_at,
        updated_at=transcription.updated_at,
        completed_at=transcription.completed_at,
    )
