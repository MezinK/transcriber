from datetime import datetime
import uuid

from pydantic import BaseModel

from infra.models import MediaType, TranscriptionStatus, WorkerStatus


class TranscriptionResponse(BaseModel):
    id: uuid.UUID
    source_filename: str
    media_type: MediaType
    status: TranscriptionStatus
    attempt_count: int
    error: str | None
    transcript_text: str | None = None
    segments_json: dict | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class TranscriptionListResponse(BaseModel):
    items: list[TranscriptionResponse]
    total: int


class WorkerResponse(BaseModel):
    id: uuid.UUID
    label: str | None
    status: WorkerStatus
    started_at: datetime
    last_heartbeat: datetime
    current_transcription_id: uuid.UUID | None = None
    last_error: str | None = None


class WorkerListResponse(BaseModel):
    items: list[WorkerResponse]
    total: int
