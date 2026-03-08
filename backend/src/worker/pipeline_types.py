from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class Word:
    word: str
    start: float | None
    end: float | None
    score: float | None = None
    speaker: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"word": self.word}
        if self.start is not None:
            payload["start"] = self.start
        if self.end is not None:
            payload["end"] = self.end
        if self.score is not None:
            payload["score"] = self.score
        if self.speaker is not None:
            payload["speaker"] = self.speaker
        return payload


@dataclass(frozen=True, slots=True)
class Segment:
    start: float
    end: float
    text: str
    words: list[Word] = field(default_factory=list)
    speaker: str | None = None
    avg_logprob: float | None = None
    no_speech_prob: float | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "start": self.start,
            "end": self.end,
            "text": self.text,
        }
        if self.words:
            payload["words"] = [word.to_dict() for word in self.words]
        if self.speaker is not None:
            payload["speaker"] = self.speaker
        if self.avg_logprob is not None:
            payload["avg_logprob"] = self.avg_logprob
        if self.no_speech_prob is not None:
            payload["no_speech_prob"] = self.no_speech_prob
        return payload


@dataclass(frozen=True, slots=True)
class TranscriptArtifacts:
    language: str | None
    segments: list[Segment]
    speakers: list[dict[str, Any]]
    turns: list[dict[str, Any]]

    def to_payload(self) -> dict[str, Any]:
        return {
            "segments_json": {"segments": [segment.to_dict() for segment in self.segments]},
            "speakers_json": [dict(speaker) for speaker in self.speakers],
            "turns_json": [dict(turn) for turn in self.turns],
        }

