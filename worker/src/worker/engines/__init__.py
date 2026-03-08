import logging
import os

from worker.transcriber import TranscriptionEngine

logger = logging.getLogger(__name__)


def get_engine() -> TranscriptionEngine:
    engine_name = os.environ.get("TRANSCRIPTION_ENGINE", "faster-whisper")

    if engine_name == "faster-whisper":
        from worker.engines.faster_whisper import FasterWhisperEngine
        model_size = os.environ.get("WHISPER_MODEL", "base")
        logger.info("Loading faster-whisper model '%s'...", model_size)
        return FasterWhisperEngine(model_size=model_size)
    else:
        raise ValueError(f"Unknown transcription engine: {engine_name}")
