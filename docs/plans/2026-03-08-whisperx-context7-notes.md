# WhisperX Context7 Notes

- Source library: `/m-bain/whisperx`
- Verification source: Context7 summary of the WhisperX Python API and README examples

## Planned Python Flow

1. `audio = whisperx.load_audio(file_path)`
2. `model = whisperx.load_model(model_name, device, compute_type=compute_type)`
3. `result = model.transcribe(audio, batch_size=batch_size)`
4. `align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)`
5. `aligned = whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)`
6. `diarizer = whisperx.diarize.DiarizationPipeline(token=hf_token, device=device)`
7. `speaker_segments = diarizer(audio, min_speakers=min_speakers, max_speakers=max_speakers)`
8. `final = whisperx.assign_word_speakers(speaker_segments, aligned)`

## Required Output Fields

- `result["language"]`
- `result["segments"]`
- `segment["words"]`
- `segment.get("speaker")`

## Runtime Notes

- Use Context7 as the source of truth for WhisperX integration details before changing runtime code.
- `device` and `compute_type` must be configurable because WhisperX supports different CPU/GPU modes.
- `batch_size` must be configurable because the docs explicitly tie it to available memory.
- A Hugging Face token is required when diarization is enabled through `DiarizationPipeline`.
- The worker should free model memory between transcription, alignment, and diarization stages.
- WhisperX audio loading goes through `whisperx.load_audio(...)`, so the worker should treat file-path input as the canonical entrypoint.
