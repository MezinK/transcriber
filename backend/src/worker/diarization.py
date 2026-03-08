from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class SpeakerSpan:
    speaker_key: str
    start: float
    end: float


class DiarizationEngine(Protocol):
    def diarize(self, file_path: str) -> list[SpeakerSpan]: ...


class PyannoteDiarizationEngine:
    def __init__(self, *, auth_token: str | None, device: str = "cpu") -> None:
        from pyannote.audio import Pipeline

        self._pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=auth_token,
        )
        self._pipeline.to(device)

    def diarize(self, file_path: str) -> list[SpeakerSpan]:
        diarization = self._pipeline(file_path)
        spans: list[SpeakerSpan] = []
        for segment, _, label in diarization.itertracks(yield_label=True):
            spans.append(
                SpeakerSpan(
                    speaker_key=str(label).lower(),
                    start=float(segment.start),
                    end=float(segment.end),
                )
            )
        return spans


def load_diarization_engine(
    engine_name: str, *, auth_token: str | None, device: str
) -> DiarizationEngine:
    if engine_name != "pyannote":
        raise ValueError(f"Unsupported diarization engine: {engine_name}")
    return PyannoteDiarizationEngine(auth_token=auth_token, device=device)
