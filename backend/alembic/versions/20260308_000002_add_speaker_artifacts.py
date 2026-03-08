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
    op.execute(
        sa.text(
            """
            UPDATE transcription_artifacts
            SET speakers_json = json_build_array(
                    json_build_object(
                        'speaker_key', :speaker_key,
                        'display_name', :display_name
                    )
                ),
                turns_json = json_build_array(
                    json_build_object(
                        'speaker_key', :speaker_key,
                        'start', 0.0,
                        'end', 0.0,
                        'text', transcript_text
                    )
                )
            WHERE transcript_text IS NOT NULL
              AND btrim(transcript_text) <> ''
            """
        ).bindparams(
            speaker_key="unknown",
            display_name="Unknown Speaker",
        )
    )
    op.drop_column("transcription_artifacts", "transcript_text")


def downgrade() -> None:
    op.add_column(
        "transcription_artifacts",
        sa.Column("transcript_text", sa.Text(), nullable=True),
    )
    op.execute(
        sa.text(
            r"""
            UPDATE transcription_artifacts
            SET transcript_text = rendered.transcript_text
            FROM (
                SELECT transcription_id,
                       string_agg(turn_item.turn ->> 'text', E'\n\n' ORDER BY turn_item.ordinality) AS transcript_text
                FROM transcription_artifacts
                CROSS JOIN LATERAL json_array_elements(
                    COALESCE(turns_json, '[]'::json)
                ) WITH ORDINALITY AS turn_item(turn, ordinality)
                GROUP BY transcription_id
            ) AS rendered
            WHERE transcription_artifacts.transcription_id = rendered.transcription_id
            """
        )
    )
    op.drop_column("transcription_artifacts", "turns_json")
    op.drop_column("transcription_artifacts", "speakers_json")
