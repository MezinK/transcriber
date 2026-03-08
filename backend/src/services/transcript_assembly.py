from __future__ import annotations

from dataclasses import dataclass


UNKNOWN_SPEAKER_KEY = "unknown"
UNKNOWN_SPEAKER_NAME = "Unknown Speaker"


@dataclass(frozen=True, slots=True)
class TranscriptArtifacts:
    speakers: list[dict]
    turns: list[dict]


def _speaker_for_word(word: dict, speaker_spans: list[dict]) -> str:
    midpoint = (float(word["start"]) + float(word["end"])) / 2
    for span in speaker_spans:
        if float(span["start"]) <= midpoint <= float(span["end"]):
            return str(span["speaker_key"])
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

    return TranscriptArtifacts(speakers=speakers, turns=turns)


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
