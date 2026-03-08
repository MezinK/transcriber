import os

from faster_whisper import WhisperModel

from worker.transcriber import TranscriptionEngine, TranscriptionResult


class FasterWhisperEngine(TranscriptionEngine):
    def __init__(self, model_size: str = "base", device: str = "cpu", compute_type: str = "int8"):
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, file_path: str) -> TranscriptionResult:
        # Pre-validate file before handing to ffmpeg
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")
        if os.path.getsize(file_path) == 0:
            raise ValueError("Audio file is empty (0 bytes)")

        segments_gen, info = self.model.transcribe(
            file_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
        )

        segments = []
        full_text_parts = []

        for segment in segments_gen:
            words = []
            if segment.words:
                words = [
                    {
                        "word": w.word,
                        "start": w.start,
                        "end": w.end,
                        "probability": w.probability,
                    }
                    for w in segment.words
                ]

            segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "words": words,
                "avg_logprob": segment.avg_logprob,
                "no_speech_prob": segment.no_speech_prob,
            })
            full_text_parts.append(segment.text.strip())

        return TranscriptionResult(
            text=" ".join(full_text_parts),
            segments=segments,
        )
