from __future__ import annotations

from typing import Protocol

from infra.config import Settings
from worker.pipeline_types import TranscriptArtifacts


class PipelineStageError(RuntimeError):
    def __init__(self, stage: str, cause: Exception | str) -> None:
        self.stage = stage
        self.cause = cause
        detail = cause if isinstance(cause, str) else f"{type(cause).__name__}: {cause}"
        self.detail = detail
        super().__init__(detail)


class TranscriptionPipeline(Protocol):
    def run(self, file_path: str) -> TranscriptArtifacts: ...


def load_pipeline(settings: Settings) -> TranscriptionPipeline:
    from worker.whisperx_pipeline import WhisperXPipeline

    if settings.transcription_backend != "whisperx":
        raise ValueError(
            f"Unsupported transcription backend: {settings.transcription_backend}"
        )

    return WhisperXPipeline(
        model_name=settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
        batch_size=settings.whisper_batch_size,
        diarization_enabled=settings.whisper_diarization_enabled,
        hf_token=settings.hf_token,
        min_speakers=settings.whisper_min_speakers,
        max_speakers=settings.whisper_max_speakers,
    )
