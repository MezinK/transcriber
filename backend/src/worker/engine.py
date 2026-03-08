from __future__ import annotations

from dataclasses import dataclass
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
        hf_token: str | None = None,
    ) -> None:
        from faster_whisper import WhisperModel

        self._model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            use_auth_token=hf_token,
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


def load_engine(
    *,
    model_size: str = "base",
    device: str = "cpu",
    compute_type: str = "int8",
    hf_token: str | None = None,
) -> TranscriptionEngine:
    return FasterWhisperEngine(
        model_size=model_size,
        device=device,
        compute_type=compute_type,
        hf_token=hf_token,
    )
