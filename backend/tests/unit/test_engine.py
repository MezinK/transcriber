from types import SimpleNamespace
import sys

import pytest

from infra.config import Settings
from worker.pipeline import load_pipeline
from worker.pipeline_types import Segment, TranscriptArtifacts, Word
from worker.whisperx_pipeline import WhisperXPipeline


def test_transcript_artifacts_serializes_to_persisted_payload():
    artifacts = TranscriptArtifacts(
        language="en",
        segments=[
            Segment(
                start=0.0,
                end=1.0,
                text="Hello world",
                words=[
                    Word(word="Hello", start=0.0, end=0.5, speaker="speaker_0"),
                    Word(word="world", start=0.5, end=1.0, speaker="speaker_0"),
                ],
                speaker="speaker_0",
            )
        ],
        speakers=[{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
        turns=[
            {
                "speaker_key": "speaker_0",
                "start": 0.0,
                "end": 1.0,
                "text": "Hello world",
            }
        ],
    )

    assert artifacts.to_payload() == {
        "segments_json": {
            "segments": [
                {
                    "start": 0.0,
                    "end": 1.0,
                    "text": "Hello world",
                    "words": [
                        {
                            "word": "Hello",
                            "start": 0.0,
                            "end": 0.5,
                            "speaker": "speaker_0",
                        },
                        {
                            "word": "world",
                            "start": 0.5,
                            "end": 1.0,
                            "speaker": "speaker_0",
                        },
                    ],
                    "speaker": "speaker_0",
                }
            ]
        },
        "speakers_json": [{"speaker_key": "speaker_0", "display_name": "Speaker 1"}],
        "turns_json": [
            {
                "speaker_key": "speaker_0",
                "start": 0.0,
                "end": 1.0,
                "text": "Hello world",
            }
        ],
    }


def test_load_pipeline_returns_whisperx_pipeline():
    pipeline = load_pipeline(Settings())

    assert isinstance(pipeline, WhisperXPipeline)


def test_load_pipeline_rejects_unknown_backend():
    with pytest.raises(ValueError, match="Unsupported transcription backend"):
        load_pipeline(Settings(transcription_backend="unknown"))


def test_load_pipeline_requires_token_when_diarization_enabled():
    with pytest.raises(
        ValueError,
        match="HF_TOKEN is required when WhisperX diarization is enabled",
    ):
        load_pipeline(Settings(whisper_diarization_enabled=True, hf_token=None))
