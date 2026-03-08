import logging
import re
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, HTTPException, Query, UploadFile, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select

from shared.config import get_settings
from shared.db import async_session
from shared.models import MediaType, Transcription, TranscriptionStatus
from shared.schemas import TranscriptionListResponse, TranscriptionResponse

logger = logging.getLogger(__name__)

router = APIRouter()

AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".wma", ".aac"}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv"}
ALLOWED_EXTENSIONS = AUDIO_EXTENSIONS | VIDEO_EXTENSIONS

CHUNK_SIZE = 1024 * 1024  # 1 MB


def _sanitize_filename(filename: str) -> str:
    """Strip path components and restrict to safe characters.

    Only allows alphanumeric, dash, underscore in the stem.
    Preserves one extension (lowercase).
    """
    name = Path(filename).name
    stem = re.sub(r"[^\w\-]", "_", Path(name).stem)[:200]
    ext = Path(name).suffix.lower()
    return f"{stem}{ext}" if stem else f"unnamed{ext}"


def _get_media_type(filename: str) -> MediaType:
    ext = Path(filename).suffix.lower()
    if ext in AUDIO_EXTENSIONS:
        return MediaType.AUDIO
    if ext in VIDEO_EXTENSIONS:
        return MediaType.VIDEO
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file type: {ext}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
    )


@router.post("/", response_model=TranscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_transcription(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    s = get_settings()
    safe_name = _sanitize_filename(file.filename)
    media_type = _get_media_type(safe_name)

    # Early Content-Length rejection if provided by client (I7)
    if file.size is not None and file.size > s.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {s.max_upload_bytes // (1024 * 1024)} MB",
        )

    file_id = uuid.uuid4()
    ext = Path(safe_name).suffix
    stored_name = f"{file_id}{ext}"
    upload_dir = Path(s.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    # Stream upload to disk with size limit
    total_size = 0
    try:
        async with aiofiles.open(file_path, "wb") as out:
            while chunk := await file.read(CHUNK_SIZE):
                total_size += len(chunk)
                if total_size > s.max_upload_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File too large. Maximum size: {s.max_upload_bytes // (1024 * 1024)} MB",
                    )
                await out.write(chunk)
    except HTTPException:
        # Clean up partial file on size limit exceeded
        file_path.unlink(missing_ok=True)
        raise
    except Exception:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")

    # Store relative path (just the filename) — avoids breaking if upload dir moves (P4)
    relative_path = stored_name

    # Create DB record — if this fails, clean up the orphaned file
    transcription = Transcription(
        file_path=str(file_path),
        file_name=safe_name,
        media_type=media_type,
    )

    try:
        async with async_session() as session:
            session.add(transcription)
            await session.commit()
            await session.refresh(transcription)
    except Exception:
        file_path.unlink(missing_ok=True)
        logger.exception("DB insert failed, cleaned up orphan file %s", file_path)
        raise HTTPException(status_code=500, detail="Failed to create transcription record")

    return transcription


@router.get("/", response_model=TranscriptionListResponse)
async def list_transcriptions(
    status_filter: TranscriptionStatus | None = Query(None, alias="status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    # Atomic count + fetch in a single transaction (I8)
    async with async_session() as session:
        async with session.begin():
            query = select(Transcription).order_by(Transcription.created_at.desc())
            count_query = select(func.count(Transcription.id))

            if status_filter:
                query = query.where(Transcription.status == status_filter)
                count_query = count_query.where(Transcription.status == status_filter)

            total = (await session.execute(count_query)).scalar_one()
            result = await session.execute(query.offset(offset).limit(limit))
            items = result.scalars().all()

    return TranscriptionListResponse(items=items, total=total)


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(transcription_id: uuid.UUID):
    async with async_session() as session:
        transcription = await session.get(Transcription, transcription_id)
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcription not found")
        return transcription


@router.delete("/{transcription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transcription(transcription_id: uuid.UUID):
    """Delete a transcription and its uploaded file."""
    async with async_session() as session:
        async with session.begin():
            transcription = await session.get(Transcription, transcription_id)
            if not transcription:
                raise HTTPException(status_code=404, detail="Transcription not found")

            file_path = transcription.file_path
            await session.execute(
                sa_delete(Transcription).where(Transcription.id == transcription_id)
            )

    # Clean up file after successful DB delete
    try:
        path = Path(file_path)
        if path.exists():
            path.unlink()
            logger.info("Deleted file %s", file_path)
    except OSError:
        logger.exception("Failed to delete file %s", file_path)
