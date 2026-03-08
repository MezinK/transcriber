# Expected Runtime Commands

- `migrate`: `uv run alembic upgrade head`
- `api`: `uv run uvicorn api.main:app --host 0.0.0.0 --port 8000`
- `worker`: `uv run python -m worker.main`

All three commands run from `backend/`, using the unified backend project and imports from `src/api`, `src/services`, `src/infra`, and `src/worker`.

The `worker` process reads WhisperX settings from the environment, including `TRANSCRIPTION_BACKEND=whisperx`, `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_BATCH_SIZE`, `WHISPER_DIARIZATION_ENABLED`, and `HF_TOKEN` when diarization is enabled.
