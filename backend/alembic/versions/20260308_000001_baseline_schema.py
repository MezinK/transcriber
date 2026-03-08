"""baseline schema

Revision ID: 20260308_000001
Revises:
Create Date: 2026-03-08 00:00:01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260308_000001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


media_type = sa.Enum("audio", "video", name="media_type", native_enum=False)
transcription_status = sa.Enum(
    "pending",
    "processing",
    "completed",
    "failed",
    name="transcription_status",
    native_enum=False,
)
worker_status = sa.Enum(
    "idle",
    "processing",
    "stale",
    name="worker_status",
    native_enum=False,
)


def upgrade() -> None:
    op.create_table(
        "transcriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_filename", sa.Text(), nullable=False),
        sa.Column("media_type", media_type, nullable=False),
        sa.Column("status", transcription_status, nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transcriptions_status_created",
        "transcriptions",
        ["status", "created_at"],
    )
    op.create_index("ix_transcriptions_created_at", "transcriptions", ["created_at"])

    op.create_table(
        "transcription_artifacts",
        sa.Column("transcription_id", sa.Uuid(), nullable=False),
        sa.Column("upload_path", sa.Text(), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("segments_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["transcription_id"], ["transcriptions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("transcription_id"),
    )

    op.create_table(
        "job_leases",
        sa.Column("transcription_id", sa.Uuid(), nullable=False),
        sa.Column("worker_id", sa.Uuid(), nullable=False),
        sa.Column("leased_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "heartbeat_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(
            ["transcription_id"], ["transcriptions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("transcription_id"),
    )
    op.create_index("ix_job_leases_leased_until", "job_leases", ["leased_until"])

    op.create_table(
        "workers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("status", worker_status, nullable=False, server_default="idle"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_heartbeat",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("current_transcription_id", sa.Uuid(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["current_transcription_id"],
            ["transcriptions.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workers_last_heartbeat", "workers", ["last_heartbeat"])
    op.create_index("ix_workers_started_at", "workers", ["started_at"])


def downgrade() -> None:
    op.drop_index("ix_workers_started_at", table_name="workers")
    op.drop_index("ix_workers_last_heartbeat", table_name="workers")
    op.drop_table("workers")

    op.drop_index("ix_job_leases_leased_until", table_name="job_leases")
    op.drop_table("job_leases")

    op.drop_table("transcription_artifacts")

    op.drop_index("ix_transcriptions_created_at", table_name="transcriptions")
    op.drop_index("ix_transcriptions_status_created", table_name="transcriptions")
    op.drop_table("transcriptions")
