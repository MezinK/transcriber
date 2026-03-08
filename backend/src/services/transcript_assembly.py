from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

from worker.pipeline_types import Segment, TranscriptArtifacts, Word

UNKNOWN_SPEAKER_KEY = "unknown"
UNKNOWN_SPEAKER_NAME = "Unknown Speaker"


def _speaker_for_word(word: dict, speaker_spans: list[dict]) -> str:
    midpoint = (float(word["start"]) + float(word["end"])) / 2
    for span in speaker_spans:
        if float(span["start"]) <= midpoint <= float(span["end"]):
            return _normalize_speaker_key(str(span["speaker_key"]))
    return UNKNOWN_SPEAKER_KEY


def _append_token(text: str, token: str) -> str:
    stripped = token.strip()
    if not stripped:
        return text
    if not text:
        return stripped
    if token[:1].isspace():
        return f"{text}{token}"
    if stripped[:1] in ",.!?;:)]}" or stripped in {"'s", "'re", "'ve", "'ll", "'d", "n't"}:
        return f"{text}{stripped}"
    if text[-1] in "([{":
        return f"{text}{stripped}"
    return f"{text} {stripped}"


def _normalize_speaker_key(value: str | None) -> str:
    if value is None:
        return UNKNOWN_SPEAKER_KEY
    stripped = value.strip()
    if not stripped:
        return UNKNOWN_SPEAKER_KEY
    return stripped.lower()


def build_transcript_artifacts(
    *, words: list[dict], speaker_spans: list[dict]
) -> TranscriptArtifacts:
    speakers: list[dict] = []
    speaker_names: dict[str, str] = {}
    turns: list[dict] = []

    for word in words:
        token = str(word.get("word", "")).strip()
        if not token:
            continue

        speaker_key = _speaker_for_word(word, speaker_spans)
        if speaker_key not in speaker_names:
            speaker_names[speaker_key] = (
                UNKNOWN_SPEAKER_NAME
                if speaker_key == UNKNOWN_SPEAKER_KEY
                else f"Speaker {len([name for name in speaker_names if name != UNKNOWN_SPEAKER_KEY]) + 1}"
            )
            speakers.append(
                {
                    "speaker_key": speaker_key,
                    "display_name": speaker_names[speaker_key],
                }
            )

        if turns and turns[-1]["speaker_key"] == speaker_key:
            turns[-1]["end"] = float(word["end"])
            turns[-1]["text"] = _append_token(turns[-1]["text"], str(word["word"]))
            continue

        turns.append(
            {
                "speaker_key": speaker_key,
                "start": float(word["start"]),
                "end": float(word["end"]),
                "text": _append_token("", str(word["word"])),
            }
        )

    return TranscriptArtifacts(
        language=None,
        segments=[],
        speakers=speakers,
        turns=turns,
    )


def build_transcript_artifacts_from_segments(
    *,
    segments: Iterable[Segment | dict[str, Any]],
    language: str | None = None,
    speaker_spans: list[dict] | None = None,
) -> TranscriptArtifacts:
    normalized_segments = [
        _normalize_segment(segment)
        for segment in segments
    ]
    if speaker_spans:
        words: list[dict] = []
        for segment in normalized_segments:
            if segment.words:
                words.extend(
                    {
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                    }
                    for word in segment.words
                    if word.start is not None and word.end is not None
                )
                continue

            text = segment.text.strip()
            if not text:
                continue
            words.append(
                {
                    "word": text,
                    "start": segment.start,
                    "end": segment.end,
                }
            )

        legacy = build_transcript_artifacts(words=words, speaker_spans=speaker_spans)
        return TranscriptArtifacts(
            language=language,
            segments=normalized_segments,
            speakers=legacy.speakers,
            turns=legacy.turns,
        )

    speakers: list[dict[str, Any]] = []
    speaker_names: dict[str, str] = {}
    turns: list[dict[str, Any]] = []

    for segment in normalized_segments:
        for token in _iter_segment_tokens(segment):
            speaker_key = token["speaker_key"]
            if speaker_key not in speaker_names:
                speaker_names[speaker_key] = (
                    UNKNOWN_SPEAKER_NAME
                    if speaker_key == UNKNOWN_SPEAKER_KEY
                    else f"Speaker {len([name for name in speaker_names if name != UNKNOWN_SPEAKER_KEY]) + 1}"
                )
                speakers.append(
                    {
                        "speaker_key": speaker_key,
                        "display_name": speaker_names[speaker_key],
                    }
                )

            if turns and turns[-1]["speaker_key"] == speaker_key:
                turns[-1]["end"] = token["end"]
                turns[-1]["text"] = _append_token(turns[-1]["text"], token["word"])
                continue

            turns.append(
                {
                    "speaker_key": speaker_key,
                    "start": token["start"],
                    "end": token["end"],
                    "text": _append_token("", token["word"]),
                }
            )

    return TranscriptArtifacts(
        language=language,
        segments=normalized_segments,
        speakers=speakers,
        turns=turns,
    )


def _normalize_segment(segment: Segment | dict[str, Any]) -> Segment:
    if isinstance(segment, Segment):
        return segment

    return Segment(
        start=float(segment.get("start", 0.0)),
        end=float(segment.get("end", 0.0)),
        text=str(segment.get("text", "")).strip(),
        words=[
            Word(
                word=str(word.get("word", "")).strip(),
                start=None if word.get("start") is None else float(word.get("start")),
                end=None if word.get("end") is None else float(word.get("end")),
                score=None if word.get("score") is None else float(word.get("score")),
                speaker=None
                if word.get("speaker") is None
                else str(word.get("speaker")),
            )
            for word in list(segment.get("words") or [])
        ],
        speaker=None if segment.get("speaker") is None else str(segment.get("speaker")),
        avg_logprob=None
        if segment.get("avg_logprob") is None
        else float(segment.get("avg_logprob")),
        no_speech_prob=None
        if segment.get("no_speech_prob") is None
        else float(segment.get("no_speech_prob")),
    )


def _iter_segment_tokens(segment: Segment) -> Iterable[dict[str, Any]]:
    if segment.words:
        for word in segment.words:
            token = word.word.strip()
            if not token:
                continue
            start = segment.start if word.start is None else word.start
            end = segment.end if word.end is None else word.end
            yield {
                "word": token,
                "start": start,
                "end": end,
                "speaker_key": _normalize_speaker_key(
                    word.speaker or segment.speaker or UNKNOWN_SPEAKER_KEY
                ),
            }
        return

    token = segment.text.strip()
    if not token:
        return

    yield {
        "word": token,
        "start": segment.start,
        "end": segment.end,
        "speaker_key": _normalize_speaker_key(
            segment.speaker or UNKNOWN_SPEAKER_KEY
        ),
    }


def rename_speaker(*, speakers: list[dict], speaker_key: str, display_name: str) -> list[dict]:
    renamed: list[dict] = []
    for speaker in speakers:
        if speaker["speaker_key"] == speaker_key:
            renamed.append(
                {
                    "speaker_key": speaker_key,
                    "display_name": display_name,
                }
            )
            continue
        renamed.append(dict(speaker))
    return renamed
