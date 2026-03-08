from dataclasses import dataclass
from typing import Protocol


@dataclass
class TranscriptionResult:
    text: str
    segments: list[dict]


class TranscriptionEngine(Protocol):
    def transcribe(self, file_path: str) -> TranscriptionResult: ...
