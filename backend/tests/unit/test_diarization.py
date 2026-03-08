from types import SimpleNamespace
import sys

import pytest

from worker.pipeline import PipelineStageError
from worker.whisperx_pipeline import WhisperXPipeline


def test_whisperx_pipeline_runs_full_flow(monkeypatch):
    calls: list[str] = []

    class FakeModel:
        def transcribe(self, audio, batch_size):
            calls.append(f"transcribe:{audio}:{batch_size}")
            return {
                "language": "en",
                "segments": [
                    {
                        "start": 0.0,
                        "end": 1.0,
                        "text": "Hello world",
                        "words": [
                            {"word": "Hello", "start": 0.0, "end": 0.5, "score": 0.9},
                            {"word": "world", "start": 0.5, "end": 1.0, "score": 0.8},
                        ],
                    }
                ],
            }

    class FakeDiarizationPipeline:
        def __init__(self, *, token, device):
            calls.append(f"diarizer:{token}:{device}")

        def __call__(self, audio, **kwargs):
            calls.append(f"diarize:{audio}:{kwargs}")
            return [{"speaker": "speaker_0"}]

    def fake_load_audio(file_path):
        calls.append(f"load_audio:{file_path}")
        return "audio-array"

    def fake_load_model(model_name, device, compute_type=None):
        calls.append(f"load_model:{model_name}:{device}:{compute_type}")
        return FakeModel()

    def fake_load_align_model(*, language_code, device):
        calls.append(f"load_align_model:{language_code}:{device}")
        return "align-model", {"language_code": language_code}

    def fake_align(segments, model, metadata, audio, device, return_char_alignments=False):
        calls.append(f"align:{audio}:{device}:{return_char_alignments}")
        return {
            "segments": [
                {
                    "start": 0.0,
                    "end": 1.0,
                    "text": "Hello world",
                    "speaker": "speaker_0",
                    "words": [
                        {
                            "word": "Hello",
                            "start": 0.0,
                            "end": 0.5,
                            "score": 0.9,
                            "speaker": "speaker_0",
                        },
                        {
                            "word": "world",
                            "start": 0.5,
                            "end": 1.0,
                            "score": 0.8,
                            "speaker": "speaker_0",
                        },
                    ],
                }
            ]
        }

    def fake_assign_word_speakers(speaker_segments, aligned):
        calls.append(f"assign_word_speakers:{speaker_segments}")
        return aligned

    monkeypatch.setitem(
        sys.modules,
        "whisperx",
        SimpleNamespace(
            load_audio=fake_load_audio,
            load_model=fake_load_model,
            load_align_model=fake_load_align_model,
            align=fake_align,
            assign_word_speakers=fake_assign_word_speakers,
        ),
    )
    monkeypatch.setitem(
        sys.modules,
        "whisperx.diarize",
        SimpleNamespace(DiarizationPipeline=FakeDiarizationPipeline),
    )
    monkeypatch.setitem(
        sys.modules,
        "torch",
        SimpleNamespace(cuda=SimpleNamespace(empty_cache=lambda: calls.append("empty_cache"))),
    )

    pipeline = WhisperXPipeline(
        model_name="base",
        device="cpu",
        compute_type="int8",
        batch_size=4,
        diarization_enabled=True,
        hf_token="token",
        min_speakers=1,
        max_speakers=2,
    )

    result = pipeline.run("/tmp/example.wav")

    assert result.language == "en"
    assert result.speakers == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
    ]
    assert result.turns == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 1.0,
            "text": "Hello world",
        }
    ]
    assert calls == [
        "load_audio:/tmp/example.wav",
        "load_model:base:cpu:int8",
        "transcribe:audio-array:4",
        "empty_cache",
        "load_align_model:en:cpu",
        "align:audio-array:cpu:False",
        "empty_cache",
        "diarizer:token:cpu",
        "diarize:audio-array:{'min_speakers': 1, 'max_speakers': 2}",
        "assign_word_speakers:[{'speaker': 'speaker_0'}]",
        "empty_cache",
    ]


def test_whisperx_pipeline_requires_token_when_diarization_enabled():
    pipeline = WhisperXPipeline(
        model_name="base",
        device="cpu",
        compute_type="int8",
        batch_size=4,
        diarization_enabled=True,
        hf_token=None,
    )

    with pytest.raises(
        PipelineStageError,
        match="ValueError: HF_TOKEN is required when WhisperX diarization is enabled",
    ):
        pipeline.run("/tmp/example.wav")
