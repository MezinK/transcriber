from __future__ import annotations

import gc
from dataclasses import dataclass

from services.transcript_assembly import build_transcript_artifacts_from_segments
from worker.pipeline_types import (
    Segment,
    TranscriptArtifacts,
    Word,
)


@dataclass(slots=True)
class WhisperXPipeline:
    model_name: str
    device: str
    compute_type: str
    batch_size: int
    diarization_enabled: bool
    hf_token: str | None = None
    min_speakers: int | None = None
    max_speakers: int | None = None

    def run(self, file_path: str) -> TranscriptArtifacts:
        import whisperx

        if self.diarization_enabled and not self.hf_token:
            raise ValueError("HF_TOKEN is required when WhisperX diarization is enabled")

        audio = whisperx.load_audio(file_path)

        model = whisperx.load_model(
            self.model_name,
            self.device,
            compute_type=self.compute_type,
        )
        raw_result = model.transcribe(audio, batch_size=self.batch_size)
        del model
        self._cleanup_memory()

        language = raw_result.get("language")
        align_model, metadata = whisperx.load_align_model(
            language_code=language,
            device=self.device,
        )
        aligned_result = whisperx.align(
            raw_result["segments"],
            align_model,
            metadata,
            audio,
            self.device,
            return_char_alignments=False,
        )
        del align_model
        self._cleanup_memory()

        speaker_annotated = aligned_result
        if self.diarization_enabled:
            from whisperx.diarize import DiarizationPipeline

            diarizer = DiarizationPipeline(token=self.hf_token, device=self.device)
            diarize_segments = diarizer(
                audio,
                min_speakers=self.min_speakers,
                max_speakers=self.max_speakers,
            )
            speaker_annotated = whisperx.assign_word_speakers(
                diarize_segments,
                aligned_result,
            )
            del diarizer
            self._cleanup_memory()

        segments = [
            _segment_from_dict(segment)
            for segment in speaker_annotated.get("segments", [])
        ]
        artifacts = build_transcript_artifacts_from_segments(
            segments=segments,
            speaker_spans=[],
        )

        return TranscriptArtifacts(
            language=language,
            segments=segments,
            speakers=artifacts.speakers,
            turns=artifacts.turns,
        )

    def _cleanup_memory(self) -> None:
        gc.collect()

        try:
            import torch

            if hasattr(torch, "cuda") and hasattr(torch.cuda, "empty_cache"):
                torch.cuda.empty_cache()
        except Exception:
            return


def _segment_from_dict(segment: dict) -> Segment:
    words = [
        Word(
            word=str(word.get("word", "")),
            start=_optional_float(word.get("start")),
            end=_optional_float(word.get("end")),
            score=_optional_float(word.get("score")),
            speaker=word.get("speaker"),
        )
        for word in list(segment.get("words") or [])
    ]
    return Segment(
        start=float(segment.get("start", 0.0)),
        end=float(segment.get("end", 0.0)),
        text=str(segment.get("text", "")).strip(),
        words=words,
        speaker=segment.get("speaker"),
        avg_logprob=_optional_float(segment.get("avg_logprob")),
        no_speech_prob=_optional_float(segment.get("no_speech_prob")),
    )


def _optional_float(value) -> float | None:
    if value is None:
        return None
    return float(value)
