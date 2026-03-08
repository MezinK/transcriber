from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TranscriptionResult:
    text: str
    segments: list[dict]


class TranscriptionEngine(ABC):
    @abstractmethod
    def transcribe(self, file_path: str) -> TranscriptionResult: ...
