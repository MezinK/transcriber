from types import SimpleNamespace
import sys

import pytest

from worker.diarization import PyannoteDiarizationEngine, SpeakerSpan, load_diarization_engine


def test_pyannote_diarization_engine_normalizes_pipeline_output(monkeypatch):
    class FakePipeline:
        def __init__(self):
            self.device = None

        @classmethod
        def from_pretrained(cls, model_name, use_auth_token=None):
            assert model_name == "pyannote/speaker-diarization-3.1"
            assert use_auth_token == "token"
            return cls()

        def to(self, device):
            self.device = device
            return self

        def __call__(self, file_path):
            assert file_path == "/tmp/example.wav"

            class FakeDiarization:
                def itertracks(self, yield_label=False):
                    items = [
                        (SimpleNamespace(start=0.0, end=1.2), None, "SPEAKER_00"),
                        (SimpleNamespace(start=1.2, end=2.0), None, "SPEAKER_01"),
                    ]
                    for item in items:
                        yield item

            return FakeDiarization()

    monkeypatch.setitem(
        sys.modules,
        "pyannote.audio",
        SimpleNamespace(Pipeline=FakePipeline),
    )

    engine = PyannoteDiarizationEngine(auth_token="token", device="cpu")

    assert engine.diarize("/tmp/example.wav") == [
        SpeakerSpan(speaker_key="speaker_00", start=0.0, end=1.2),
        SpeakerSpan(speaker_key="speaker_01", start=1.2, end=2.0),
    ]


def test_load_diarization_engine_rejects_unknown_engine():
    with pytest.raises(ValueError, match="Unsupported diarization engine"):
        load_diarization_engine("unknown", auth_token=None, device="cpu")
