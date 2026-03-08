from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Protocol


@dataclass(frozen=True, slots=True)
class TranscriptionResult:
    text: str
    segments: list[dict]


class TranscriptionEngine(Protocol):
    def transcribe(self, file_path: str) -> TranscriptionResult: ...


class FasterWhisperEngine:
    def __init__(
        self,
        *,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        from faster_whisper import WhisperModel

        self._model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    def transcribe(self, file_path: str) -> TranscriptionResult:
        segments_gen, _ = self._model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
        )

        segments: list[dict] = []
        text_parts: list[str] = []
        for segment in segments_gen:
            words = [
                {
                    "word": word.word,
                    "start": word.start,
                    "end": word.end,
                    "probability": word.probability,
                }
                for word in (segment.words or [])
            ]
            text = segment.text.strip()
            segments.append(
                {
                    "start": segment.start,
                    "end": segment.end,
                    "text": text,
                    "words": words,
                    "avg_logprob": segment.avg_logprob,
                    "no_speech_prob": segment.no_speech_prob,
                }
            )
            text_parts.append(text)

        return TranscriptionResult(
            text=" ".join(part for part in text_parts if part),
            segments=segments,
        )


def load_engine() -> TranscriptionEngine:
    engine_name = os.environ.get("TRANSCRIPTION_ENGINE", "faster-whisper")
    if engine_name != "faster-whisper":
        raise ValueError(f"Unsupported transcription engine: {engine_name}")

    return FasterWhisperEngine(
        model_size=os.environ.get("WHISPER_MODEL", "base"),
        device=os.environ.get("WHISPER_DEVICE", "cpu"),
        compute_type=os.environ.get("WHISPER_COMPUTE_TYPE", "int8"),
    )
