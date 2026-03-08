import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Text, func
from sqlalchemy import JSON, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from infra.ids import generate_uuid


class Base(DeclarativeBase):
    pass


class TranscriptionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MediaType(str, enum.Enum):
    AUDIO = "audio"
    VIDEO = "video"


class WorkerStatus(str, enum.Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    STALE = "stale"


class Transcription(Base):
    __tablename__ = "transcriptions"
    __table_args__ = (
        Index("ix_transcriptions_status_created", "status", "created_at"),
        Index("ix_transcriptions_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=generate_uuid)
    source_filename: Mapped[str] = mapped_column(Text, nullable=False)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="media_type", native_enum=False),
        nullable=False,
    )
    status: Mapped[TranscriptionStatus] = mapped_column(
        Enum(TranscriptionStatus, name="transcription_status", native_enum=False),
        nullable=False,
        default=TranscriptionStatus.PENDING,
        server_default=TranscriptionStatus.PENDING.value,
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    artifact: Mapped["TranscriptionArtifact | None"] = relationship(
        back_populates="transcription", cascade="all, delete-orphan", uselist=False
    )
    lease: Mapped["JobLease | None"] = relationship(
        back_populates="transcription", cascade="all, delete-orphan", uselist=False
    )


class TranscriptionArtifact(Base):
    __tablename__ = "transcription_artifacts"

    transcription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("transcriptions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    upload_path: Mapped[str] = mapped_column(Text, nullable=False)
    segments_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    speakers_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    turns_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)

    transcription: Mapped[Transcription] = relationship(back_populates="artifact")


class JobLease(Base):
    __tablename__ = "job_leases"
    __table_args__ = (
        Index("ix_job_leases_leased_until", "leased_until"),
    )

    transcription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("transcriptions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    worker_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    leased_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    heartbeat_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    attempt: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )

    transcription: Mapped[Transcription] = relationship(back_populates="lease")


class Worker(Base):
    __tablename__ = "workers"
    __table_args__ = (
        Index("ix_workers_last_heartbeat", "last_heartbeat"),
        Index("ix_workers_started_at", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=generate_uuid)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[WorkerStatus] = mapped_column(
        Enum(WorkerStatus, name="worker_status", native_enum=False),
        nullable=False,
        default=WorkerStatus.IDLE,
        server_default=WorkerStatus.IDLE.value,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_heartbeat: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    current_transcription_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("transcriptions.id", ondelete="SET NULL"),
        nullable=True,
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
