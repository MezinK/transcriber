from __future__ import annotations

import gc
from dataclasses import dataclass
from typing import Any

from services.transcript_assembly import build_transcript_artifacts_from_segments
from worker.pipeline_types import Segment, TranscriptArtifacts, Word


@dataclass(slots=True)
class WhisperXPipeline:
    model_name: str
    device: str
    compute_type: str
    batch_size: int
    diarization_enabled: bool
    hf_token: str | None
    min_speakers: int | None = None
    max_speakers: int | None = None

    def run(self, file_path: str) -> TranscriptArtifacts:
        if self.diarization_enabled and not self.hf_token:
            raise ValueError(
                "HF_TOKEN is required when WhisperX diarization is enabled"
            )

        import whisperx
        from whisperx.diarize import DiarizationPipeline

        audio = whisperx.load_audio(file_path)

        model = whisperx.load_model(
            self.model_name,
            self.device,
            compute_type=self.compute_type,
        )
        try:
            result = model.transcribe(audio, batch_size=self.batch_size)
        finally:
            self._release_resources(model)

        language = result.get("language")
        align_model, metadata = whisperx.load_align_model(
            language_code=language,
            device=self.device,
        )
        try:
            aligned = whisperx.align(
                result.get("segments", []),
                align_model,
                metadata,
                audio,
                self.device,
                return_char_alignments=False,
            )
        finally:
            self._release_resources(align_model)

        enriched = aligned
        if self.diarization_enabled:
            diarizer = DiarizationPipeline(token=self.hf_token, device=self.device)
            diarize_kwargs: dict[str, Any] = {}
            if self.min_speakers is not None:
                diarize_kwargs["min_speakers"] = self.min_speakers
            if self.max_speakers is not None:
                diarize_kwargs["max_speakers"] = self.max_speakers

            try:
                speaker_segments = diarizer(audio, **diarize_kwargs)
                enriched = whisperx.assign_word_speakers(speaker_segments, aligned)
            finally:
                self._release_resources(diarizer)

        typed_segments = [
            self._segment_from_dict(segment)
            for segment in enriched.get("segments", [])
        ]
        return build_transcript_artifacts_from_segments(
            segments=typed_segments,
            language=language,
        )

    @staticmethod
    def _segment_from_dict(segment: dict[str, Any]) -> Segment:
        return Segment(
            start=float(segment.get("start", 0.0)),
            end=float(segment.get("end", 0.0)),
            text=str(segment.get("text", "")).strip(),
            words=[
                Word(
                    word=str(word.get("word", "")).strip(),
                    start=None
                    if word.get("start") is None
                    else float(word.get("start")),
                    end=None if word.get("end") is None else float(word.get("end")),
                    score=None
                    if word.get("score") is None
                    else float(word.get("score")),
                    speaker=None
                    if word.get("speaker") is None
                    else str(word.get("speaker")),
                )
                for word in list(segment.get("words") or [])
            ],
            speaker=None
            if segment.get("speaker") is None
            else str(segment.get("speaker")),
            avg_logprob=None
            if segment.get("avg_logprob") is None
            else float(segment.get("avg_logprob")),
            no_speech_prob=None
            if segment.get("no_speech_prob") is None
            else float(segment.get("no_speech_prob")),
        )

    @staticmethod
    def _release_resources(resource: object | None) -> None:
        del resource
        gc.collect()
        try:
            import torch

            if hasattr(torch, "cuda") and hasattr(torch.cuda, "empty_cache"):
                torch.cuda.empty_cache()
        except Exception:
            return
