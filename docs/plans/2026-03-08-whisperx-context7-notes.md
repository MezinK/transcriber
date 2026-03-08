# WhisperX Context7 Notes

- Library: `/m-bain/whisperx`
- Integration source: Context7 queries against the upstream WhisperX documentation and README

## Pipeline Order

- `whisperx.load_audio(file_path)`
- `whisperx.load_model(model_name, device, compute_type=...)`
- `model.transcribe(audio, batch_size=...)`
- `whisperx.load_align_model(language_code=result["language"], device=device)`
- `whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)`
- `whisperx.diarize.DiarizationPipeline(token=hf_token, device=device)`
- `diarizer(audio, min_speakers=..., max_speakers=...)`
- `whisperx.assign_word_speakers(diarize_segments, aligned_result)`

## Required Output Fields

- `result["language"]`
- `result["segments"]`
- `segment["start"]`
- `segment["end"]`
- `segment["text"]`
- `segment["words"]`
- `segment.get("speaker")`
- `word["word"]`
- `word.get("start")`
- `word.get("end")`
- `word.get("speaker")`

## Runtime Notes

- Diarization requires a Hugging Face token when diarization is enabled.
- Device and compute type must be configurable.
- Batch size must be configurable because memory needs differ by CPU/GPU setup.
- The worker should release stage models between transcription, alignment, and diarization to reduce memory pressure.
- WhisperX audio loading expects FFmpeg-compatible media input and normalizes audio for the pipeline.

## Implementation Guidance

- Do not implement the backend integration from memory.
- Re-check Context7 before changing the WhisperX pipeline contract, model-loading flow, or diarization behavior.
- Convert WhisperX output into backend-owned typed DTOs before persisting JSON artifacts.
