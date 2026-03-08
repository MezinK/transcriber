"""replace stored transcript text with speaker artifacts

Revision ID: 20260308_000002
Revises: 20260308_000001
Create Date: 2026-03-08 00:00:02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260308_000002"
down_revision: str | None = "20260308_000001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transcription_artifacts",
        sa.Column("speakers_json", sa.JSON(), nullable=True),
    )
    op.add_column(
        "transcription_artifacts",
        sa.Column("turns_json", sa.JSON(), nullable=True),
    )
    op.drop_column("transcription_artifacts", "transcript_text")


def downgrade() -> None:
    op.add_column(
        "transcription_artifacts",
        sa.Column("transcript_text", sa.Text(), nullable=True),
    )
    op.drop_column("transcription_artifacts", "turns_json")
    op.drop_column("transcription_artifacts", "speakers_json")
