import uuid
from datetime import datetime

from pydantic import BaseModel

from shared.models import MediaType, TranscriptionStatus


class TranscriptionCreate(BaseModel):
    """Internal schema — not used as request body (upload is multipart)."""
    file_path: str
    file_name: str
    media_type: MediaType


class TranscriptionResponse(BaseModel):
    id: uuid.UUID
    status: TranscriptionStatus
    file_name: str
    media_type: MediaType
    result_text: str | None = None
    result_json: dict | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class TranscriptionListResponse(BaseModel):
    items: list[TranscriptionResponse]
    total: int


class WorkerCurrentJob(BaseModel):
    id: uuid.UUID
    file_name: str
    status: TranscriptionStatus

    model_config = {"from_attributes": True}


class WorkerResponse(BaseModel):
    id: uuid.UUID
    last_heartbeat: datetime
    started_at: datetime
    current_job: WorkerCurrentJob | None = None

    model_config = {"from_attributes": True}


class WorkerListResponse(BaseModel):
    items: list[WorkerResponse]
    total: int
