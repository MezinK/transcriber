# WhisperX Backend Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current `faster-whisper` + `pyannote` backend worker stack with a single WhisperX-based pipeline, while cleaning up the backend boundaries that would otherwise make the cutover noisy and brittle.

**Architecture:** A big-bang cutover is acceptable here. Do not preserve compatibility with the old split `engine + diarization + assembly` runtime longer than necessary. Instead, use Context7 to lock the actual WhisperX API contract, introduce one typed worker pipeline boundary, implement the WhisperX adapter directly, rewire the runtime to that pipeline, and then delete the legacy transcription modules and config surface in the same branch.

**Tech Stack:** FastAPI, SQLAlchemy asyncio, Alembic, Docker Compose, uv, pytest, Context7, WhisperX

---

### Task 1: Capture The WhisperX Contract From Context7

**Files:**
- Create: `docs/plans/2026-03-08-whisperx-context7-notes.md`
- Modify: `backend/README.md`

**Step 1: Query Context7 for WhisperX**

Resolve `/m-bain/whisperx` and document the actual Python flow we will implement:
- `whisperx.load_audio()`
- `whisperx.load_model(...).transcribe(...)`
- `whisperx.load_align_model(...)`
- `whisperx.align(...)`
- `whisperx.diarize.DiarizationPipeline(...)`
- `whisperx.assign_word_speakers(...)`

Also capture operational caveats from Context7:
- device and compute type choices
- batch-size tuning
- Hugging Face token requirement for diarization
- memory cleanup between ASR, alignment, and diarization stages

**Step 2: Write the integration note**

Create `docs/plans/2026-03-08-whisperx-context7-notes.md` with:

```md
# WhisperX Context7 Notes

- Library: `/m-bain/whisperx`
- Pipeline order: load_audio -> transcribe -> align -> diarize -> assign_word_speakers
- Required output fields:
  - `result["language"]`
  - `result["segments"]`
  - `segment["words"]`
  - `segment.get("speaker")`
- Runtime notes:
  - Hugging Face token is required when diarization is enabled
  - free model memory between stages
  - batch size and compute type must be configurable
```

**Step 3: Add a README guardrail**

Update `backend/README.md` to say WhisperX integration changes must be verified against Context7, not memory.

**Step 4: Verify the docs**

Run: `rg -n "WhisperX|Context7" backend/README.md docs/plans/2026-03-08-whisperx-context7-notes.md`

Expected: both files explicitly mention WhisperX and Context7.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-08-whisperx-context7-notes.md backend/README.md
git commit -m "docs: capture whisperx integration contract"
```

### Task 2: Replace The Config Surface With One Typed WhisperX Runtime Config

**Files:**
- Modify: `backend/src/infra/config.py`
- Modify: `backend/src/worker/main.py`
- Modify: `backend/pyproject.toml`
- Modify: `backend/Dockerfile`
- Modify: `docker-compose.yml`
- Test: `backend/tests/unit/test_config.py`

**Step 1: Write the failing config tests**

Add tests to `backend/tests/unit/test_config.py` for the final config surface:

```python
def test_settings_exposes_whisperx_defaults():
    settings = get_settings()

    assert settings.transcription_backend == "whisperx"
    assert settings.whisper_model == "base"
    assert settings.whisper_device == "cpu"
    assert settings.whisper_compute_type == "int8"
    assert settings.whisper_batch_size == 4
    assert settings.whisper_diarization_enabled is True
    assert settings.hf_token is None
```

Add an env override test proving these values are read through `Settings`.

**Step 2: Run the targeted config tests and verify they fail**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_config.py -k "whisperx_defaults or override"`

Expected: FAIL because the new settings do not exist yet.

**Step 3: Implement the new settings**

Add fields like:

```python
class Settings(BaseSettings):
    transcription_backend: str = "whisperx"
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_batch_size: int = 4
    whisper_diarization_enabled: bool = True
    whisper_min_speakers: int | None = None
    whisper_max_speakers: int | None = None
    hf_token: str | None = None
```

Delete old config fields and env names that only existed to support the split stack:
- `TRANSCRIPTION_ENGINE`
- `DIARIZATION_ENGINE`
- `DIARIZATION_DEVICE`

**Step 4: Put WhisperX in the worker runtime only**

Refactor `backend/pyproject.toml` and Docker install flow so:
- base backend deps remain web/DB/migrations
- WhisperX lives in a worker-only extra or dependency group
- `api` and `migrate` do not install WhisperX
- `worker` does install WhisperX

Convert `backend/Dockerfile` into explicit multi-stage targets:

```dockerfile
FROM python:... AS backend-base
# shared OS deps, uv, code, common Python deps

FROM backend-base AS backend-api
# install only API/migration dependency set

FROM backend-base AS backend-worker
# install worker dependency set including WhisperX
```

Then update Compose so:
- `api` builds `target: backend-api`
- `migrate` builds `target: backend-api`
- `worker` builds `target: backend-worker`

**Step 5: Update Compose**

Switch `docker-compose.yml` to the new env surface and remove references to `faster-whisper` and `pyannote`.

**Step 6: Re-run config tests**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_config.py`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/infra/config.py backend/src/worker/main.py backend/pyproject.toml backend/Dockerfile docker-compose.yml backend/tests/unit/test_config.py
git commit -m "refactor: replace split transcription config with whisperx settings"
```

### Task 3: Introduce One Typed Pipeline Contract And Implement WhisperX Directly

**Files:**
- Create: `backend/src/worker/pipeline_types.py`
- Create: `backend/src/worker/pipeline.py`
- Create: `backend/src/worker/whisperx_pipeline.py`
- Modify: `backend/src/services/transcript_assembly.py`
- Test: `backend/tests/unit/test_engine.py`
- Test: `backend/tests/unit/test_transcript_assembly.py`
- Test: `backend/tests/unit/test_diarization.py`

**Step 1: Write the failing contract and adapter tests**

Replace the old engine/diarization-focused tests with pipeline-focused tests.

Add a unit test for typed artifacts:

```python
def test_pipeline_result_serializes_to_persisted_artifacts():
    result = TranscriptArtifacts(
        language="en",
        segments=[...],
        speakers=[...],
        turns=[...],
    )

    assert result.to_payload() == {
        "segments_json": {"segments": [...]},
        "speakers_json": [...],
        "turns_json": [...],
    }
```

Add a unit test that monkeypatches `whisperx` and asserts this call order:

```python
audio = whisperx.load_audio(file_path)
model = whisperx.load_model(model_name, device, compute_type=compute_type)
raw = model.transcribe(audio, batch_size=batch_size)
align_model, metadata = whisperx.load_align_model(language_code=raw["language"], device=device)
aligned = whisperx.align(raw["segments"], align_model, metadata, audio, device, return_char_alignments=False)
diarizer = DiarizationPipeline(token=hf_token, device=device)
speaker_segments = diarizer(audio, min_speakers=min_speakers, max_speakers=max_speakers)
final = whisperx.assign_word_speakers(speaker_segments, aligned)
```

**Step 2: Run the targeted tests and verify they fail**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_engine.py backend/tests/unit/test_transcript_assembly.py backend/tests/unit/test_diarization.py -k "pipeline or whisperx or artifact"`

Expected: FAIL because the new contract and WhisperX adapter do not exist yet.

**Step 3: Add the typed pipeline DTOs**

Create dataclasses or pydantic models for:
- word
- segment
- transcript artifacts

Keep the database JSON as a serialization boundary only. Do not keep vendor-shaped dicts as your in-memory contract.

**Step 4: Implement the WhisperX adapter**

In `backend/src/worker/whisperx_pipeline.py`:
- use the Context7-verified WhisperX flow
- convert the final result into typed DTOs
- build `speakers` and `turns` from the speaker-enriched aligned words
- support diarization-off mode if configured
- release stage models between transcribe, align, and diarize phases

**Step 5: Make transcript assembly typed**

Refactor `backend/src/services/transcript_assembly.py` so it operates on the pipeline DTOs or DTO-shaped data, not on legacy faster-whisper assumptions.

**Step 6: Re-run the targeted tests**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_engine.py backend/tests/unit/test_transcript_assembly.py backend/tests/unit/test_diarization.py -k "pipeline or whisperx or artifact"`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/worker/pipeline_types.py backend/src/worker/pipeline.py backend/src/worker/whisperx_pipeline.py backend/src/services/transcript_assembly.py backend/tests/unit/test_engine.py backend/tests/unit/test_transcript_assembly.py backend/tests/unit/test_diarization.py
git commit -m "feat: add typed whisperx transcription pipeline"
```

### Task 4: Rewire Worker Runtime And Delete The Legacy Split Stack

**Files:**
- Modify: `backend/src/worker/main.py`
- Modify: `backend/src/services/jobs.py`
- Modify: `backend/src/services/workers.py`
- Delete: `backend/src/worker/engine.py`
- Delete: `backend/src/worker/diarization.py`
- Test: `backend/tests/unit/test_jobs.py`
- Test: `backend/tests/integration/test_worker_runtime.py`

**Step 1: Write the failing worker runtime tests**

Update `backend/tests/integration/test_worker_runtime.py` so `WorkerRuntime` depends on one pipeline:

```python
runtime = WorkerRuntime(
    session_factory=database.session_factory,
    pipeline=FakePipeline(...),
    ...
)
```

Add assertions that:
- success persists canonical artifacts returned by the pipeline
- failures persist stage + message, not only the exception type
- no runtime path references separate engine/diarization loaders

**Step 2: Run the targeted runtime tests and verify they fail**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py -k "pipeline or error"`

Expected: FAIL because the runtime still expects the old modules.

**Step 3: Rewire the runtime**

Refactor `backend/src/worker/main.py` so:
- it loads one pipeline from `load_pipeline(settings)`
- `run_once()` calls `pipeline.run(claim.upload_path)`
- persistence writes come from the pipeline payload
- failure messages include stage + exception message

**Step 4: Consolidate worker lifecycle helpers**

Remove duplicated worker-state authority. Keep one mutation path between `services.jobs` and `services.workers`, not two overlapping ones.

**Step 5: Delete the old modules**

Remove `backend/src/worker/engine.py` and `backend/src/worker/diarization.py` once all callers are gone.

**Step 6: Re-run the targeted tests**

Run: `uv run --project backend python -m pytest -q backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py -k "pipeline or error"`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/worker/main.py backend/src/services/jobs.py backend/src/services/workers.py backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py
git rm backend/src/worker/engine.py backend/src/worker/diarization.py
git commit -m "refactor: cut over worker runtime to whisperx pipeline"
```

### Task 5: Clean Up Reads, Tests, And Docs Around The New Backend Shape

**Files:**
- Create: `backend/src/services/transcriptions.py`
- Modify: `backend/src/api/routes/transcriptions.py`
- Modify: `backend/tests/integration/conftest.py`
- Modify: `backend/tests/integration/test_job_lifecycle.py`
- Modify: `backend/tests/integration/test_worker_runtime.py`
- Modify: `backend/README.md`
- Modify: `backend/tests/integration/test_container_commands.md`
- Modify: `docker-compose.yml`
- Test: `backend/tests/integration/test_api_transcriptions.py`

**Step 1: Write the failing cleanup tests**

Add or update tests so they verify:
- list/get transcription reads still return the same API contract
- the integration harness uses shared Postgres helpers from `conftest.py`
- the backend docs no longer mention `faster-whisper` or `pyannote`

**Step 2: Run the targeted cleanup tests and verify they fail**

Run: `uv run --project backend python -m pytest -q backend/tests/integration/test_api_transcriptions.py backend/tests/integration/test_job_lifecycle.py backend/tests/integration/test_worker_runtime.py -k "transcription or harness"`

Expected: FAIL because the codebase still contains old boundaries and duplicated harness logic.

**Step 3: Move read queries into a service**

Create `backend/src/services/transcriptions.py` and move list/get query + serialization logic out of `backend/src/api/routes/transcriptions.py`.

**Step 4: Deduplicate the integration harness**

Move Docker Postgres lifecycle helpers into `backend/tests/integration/conftest.py` and update other integration files to use the shared fixture instead of reimplementing the same container boot logic.

**Step 5: Clean the docs**

Update README, container command docs, and Compose comments so they describe only the WhisperX-based backend.

**Step 6: Re-run the targeted cleanup tests**

Run: `uv run --project backend python -m pytest -q backend/tests/integration/test_api_transcriptions.py backend/tests/integration/test_job_lifecycle.py backend/tests/integration/test_worker_runtime.py -k "transcription or harness"`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/src/services/transcriptions.py backend/src/api/routes/transcriptions.py backend/tests/integration/conftest.py backend/tests/integration/test_job_lifecycle.py backend/tests/integration/test_worker_runtime.py backend/README.md backend/tests/integration/test_container_commands.md docker-compose.yml backend/tests/integration/test_api_transcriptions.py
git commit -m "refactor: clean backend around whisperx cutover"
```

### Task 6: Final Verification

**Files:**
- Modify: `backend/README.md`
- Modify: `backend/tests/integration/test_container_commands.md`

**Step 1: Run the full backend test suite**

Run: `uv run --project backend python -m pytest -q backend/tests/unit`

Expected: PASS

Run: `uv run --project backend python -m pytest -q backend/tests/integration`

Expected: PASS

**Step 2: Run a container smoke test**

Run:

```bash
docker compose build api worker migrate
docker compose up -d postgres migrate api worker
curl http://localhost:8000/health
```

Expected: healthy API response.

**Step 3: Run one manual transcription**

Verify manually:
- upload a short file
- wait for completion
- confirm `speakers` and `turns` are present in the response
- confirm speaker rename still works

**Step 4: Update the final docs if commands changed**

Make `backend/README.md` and `backend/tests/integration/test_container_commands.md` match the actual verified commands and env vars.

**Step 5: Commit**

```bash
git add backend/README.md backend/tests/integration/test_container_commands.md
git commit -m "docs: finalize whisperx backend runtime docs"
```
