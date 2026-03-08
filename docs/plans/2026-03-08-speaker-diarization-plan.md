# Speaker-Turn Diarization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add transcript-local speaker diarization so each completed transcription exposes renameable speaker labels such as `Speaker 1`, `Speaker 2` and canonical timed speaker turns stored as JSON.

**Architecture:** Keep transcription and diarization as separate worker capabilities. `faster-whisper` remains the transcription engine, a new diarization engine produces speaker spans, and a shared transcript assembly layer merges word timestamps plus diarization into canonical speaker turns. Speaker display names are stored per transcription so renames never leak across uploads, and the canonical stored output is JSON only: `segments_json`, `speakers_json`, and `turns_json`.

**Tech Stack:** FastAPI, SQLAlchemy ORM, Alembic, PostgreSQL JSON columns, `faster-whisper`, `pyannote.audio`, pytest, pytest-asyncio

---

### Task 1: Replace Stored Transcript Text With Speaker JSON Artifacts

**Files:**
- Create: `backend/alembic/versions/20260308_000002_add_speaker_artifacts.py`
- Modify: `backend/src/infra/models.py`
- Modify: `backend/tests/integration/test_migrations.py`

**Step 1: Write the failing migration test**

Add an assertion that the upgraded schema contains the new artifact columns and no longer contains `transcript_text`:

```python
from sqlalchemy import inspect


def test_alembic_upgrade_head(applied_database: AppliedDatabase):
    assert applied_database.current_revision == applied_database.head_revision

    engine = create_engine(applied_database.database_url)
    try:
        columns = {
            column["name"]
            for column in inspect(engine).get_columns("transcription_artifacts")
        }
    finally:
        engine.dispose()

    assert "speakers_json" in columns
    assert "turns_json" in columns
    assert "transcript_text" not in columns
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest -q backend/tests/integration/test_migrations.py::test_alembic_upgrade_head`

Expected: FAIL because `speakers_json` and `turns_json` do not exist and `transcript_text` still exists.

**Step 3: Write minimal implementation**

Add nullable JSON columns to the ORM model, remove `transcript_text` from the ORM model, and create a matching Alembic migration:

```python
class TranscriptionArtifact(Base):
    __tablename__ = "transcription_artifacts"

    transcription_id: Mapped[uuid.UUID] = mapped_column(...)
    upload_path: Mapped[str] = mapped_column(Text, nullable=False)
    segments_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    speakers_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    turns_json: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
```

```python
def upgrade() -> None:
    op.add_column(
        "transcription_artifacts",
        sa.Column("speakers_json", sa.JSON(), nullable=True),
    )
    op.add_column(
        "transcription_artifacts",
        sa.Column("turns_json", sa.JSON(), nullable=True),
    )
    op.drop_column("transcription_artifacts", "transcript_text")


def downgrade() -> None:
    op.add_column(
        "transcription_artifacts",
        sa.Column("transcript_text", sa.Text(), nullable=True),
    )
    op.drop_column("transcription_artifacts", "turns_json")
    op.drop_column("transcription_artifacts", "speakers_json")
```

Also update the migration harness fixture to expose `database_url` so the schema can be inspected after `upgrade head`.

**Step 4: Run test to verify it passes**

Run: `uv run pytest -q backend/tests/integration/test_migrations.py::test_alembic_upgrade_head`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/alembic/versions/20260308_000002_add_speaker_artifacts.py backend/src/infra/models.py backend/tests/integration/test_migrations.py
git commit -m "feat: replace stored transcript text with speaker json"
```

### Task 2: Build Canonical Speaker-Turn Assembly Logic

**Files:**
- Create: `backend/src/services/transcript_assembly.py`
- Test: `backend/tests/unit/test_transcript_assembly.py`

**Step 1: Write the failing tests**

Create unit tests that prove the assembly layer:
- assigns words to diarized speakers
- groups consecutive words by speaker into turns
- does not split a turn while the speaker stays the same, even if Whisper emitted multiple short segments
- falls back to `Unknown Speaker` when no diarization span matches

Example:

```python
def test_build_transcript_artifacts_groups_words_into_speaker_turns():
    words = [
        {"word": "Hello", "start": 0.0, "end": 0.4},
        {"word": "there", "start": 0.4, "end": 0.8},
        {"word": "Hi", "start": 1.2, "end": 1.4},
    ]
    speaker_spans = [
        {"speaker_key": "speaker_0", "start": 0.0, "end": 1.0},
        {"speaker_key": "speaker_1", "start": 1.0, "end": 2.0},
    ]

    result = build_transcript_artifacts(words=words, speaker_spans=speaker_spans)

    assert result.speakers == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"},
        {"speaker_key": "speaker_1", "display_name": "Speaker 2"},
    ]
    assert result.turns[0]["speaker_key"] == "speaker_0"
    assert result.turns[0]["text"] == "Hello there"
    assert result.turns[1]["speaker_key"] == "speaker_1"
    assert result.turns[1]["text"] == "Hi"
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest -q backend/tests/unit/test_transcript_assembly.py`

Expected: FAIL because the module and functions do not exist.

**Step 3: Write minimal implementation**

Implement a pure assembly module with typed helpers:

```python
@dataclass(frozen=True, slots=True)
class TranscriptArtifacts:
    speakers: list[dict]
    turns: list[dict]


def build_transcript_artifacts(*, words: list[dict], speaker_spans: list[dict]) -> TranscriptArtifacts:
    ...


def rename_speaker(*, speakers: list[dict], speaker_key: str, display_name: str) -> list[dict]:
    ...
```

Implementation rules:
- speaker keys stay canonical, for example `speaker_0`
- default names are assigned by first appearance order as `Speaker 1..N`
- turns are grouped only when adjacent words share the same speaker
- turns split only on speaker change
- punctuation stays attached to the preceding token when possible
- all logic stays pure and engine-agnostic

**Step 4: Run test to verify it passes**

Run: `uv run pytest -q backend/tests/unit/test_transcript_assembly.py`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/transcript_assembly.py backend/tests/unit/test_transcript_assembly.py
git commit -m "feat: add speaker turn assembly"
```

### Task 3: Add A Swappable Diarization Engine

**Files:**
- Create: `backend/src/worker/diarization.py`
- Modify: `backend/src/infra/config.py`
- Modify: `backend/pyproject.toml`
- Modify: `backend/README.md`
- Modify: `docker-compose.yml`
- Test: `backend/tests/unit/test_config.py`
- Test: `backend/tests/unit/test_diarization.py`

**Step 1: Write the failing tests**

Add unit tests for:
- config defaults and env overrides for diarization settings
- a pyannote diarization adapter that normalizes pipeline output into simple speaker spans

Example config test:

```python
def test_settings_exposes_diarization_defaults(monkeypatch):
    monkeypatch.delenv("DIARIZATION_ENGINE", raising=False)
    monkeypatch.delenv("PYANNOTE_AUTH_TOKEN", raising=False)

    settings = Settings()

    assert settings.diarization_engine == "pyannote"
    assert settings.pyannote_auth_token is None
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest -q backend/tests/unit/test_config.py backend/tests/unit/test_diarization.py`

Expected: FAIL because the settings and diarization module do not exist yet.

**Step 3: Write minimal implementation**

Add a separate diarization abstraction:

```python
@dataclass(frozen=True, slots=True)
class SpeakerSpan:
    speaker_key: str
    start: float
    end: float


class DiarizationEngine(Protocol):
    def diarize(self, file_path: str) -> list[SpeakerSpan]: ...
```

```python
class PyannoteDiarizationEngine:
    def __init__(self, *, auth_token: str | None, device: str = "cpu") -> None:
        ...

    def diarize(self, file_path: str) -> list[SpeakerSpan]:
        ...
```

Add settings:

```python
class Settings(BaseSettings):
    ...
    diarization_engine: str = "pyannote"
    diarization_device: str = "cpu"
    pyannote_auth_token: str | None = None
```

Add dependency and docs:
- add `pyannote.audio` to `backend/pyproject.toml`
- document that the worker now needs `PYANNOTE_AUTH_TOKEN` to download/load diarization models
- set diarization env vars for the `worker` service in `docker-compose.yml`

Keep tests fake-only. Do not download models in unit or integration tests.

**Step 4: Run test to verify it passes**

Run: `uv run pytest -q backend/tests/unit/test_config.py backend/tests/unit/test_diarization.py`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/worker/diarization.py backend/src/infra/config.py backend/pyproject.toml backend/README.md docker-compose.yml backend/tests/unit/test_config.py backend/tests/unit/test_diarization.py
git commit -m "feat: add diarization engine abstraction"
```

### Task 4: Wire Diarization Into Worker Completion

**Files:**
- Modify: `backend/src/worker/engine.py`
- Modify: `backend/src/worker/main.py`
- Modify: `backend/src/services/jobs.py`
- Test: `backend/tests/unit/test_jobs.py`
- Test: `backend/tests/integration/test_worker_runtime.py`

**Step 1: Write the failing tests**

Add worker and job tests that prove:
- the worker runs transcription and diarization for a claimed file
- `complete_transcription()` persists `segments_json`, `speakers_json`, and `turns_json`
- upload cleanup still happens only after commit

Example assertion:

```python
assert artifact.speakers_json == [
    {"speaker_key": "speaker_0", "display_name": "Speaker 1"},
    {"speaker_key": "speaker_1", "display_name": "Speaker 2"},
]
assert artifact.turns_json == [
    {
        "speaker_key": "speaker_0",
        "start": 0.0,
        "end": 0.8,
        "text": "Hello there",
    }
]
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest -q backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py -k "speaker or transcript"`

Expected: FAIL because `complete_transcription()` and `WorkerRuntime` do not persist speaker artifacts yet.

**Step 3: Write minimal implementation**

Make the worker own both engines and assembly:

```python
class WorkerRuntime:
    def __init__(..., engine: TranscriptionEngine, diarization_engine: DiarizationEngine, ...):
        self.engine = engine
        self.diarization_engine = diarization_engine
```

```python
transcription_result = self.engine.transcribe(claim.upload_path)
speaker_spans = self.diarization_engine.diarize(claim.upload_path)
artifacts = build_transcript_artifacts(
    words=_flatten_words(transcription_result.segments),
    speaker_spans=[span.__dict__ for span in speaker_spans],
)

await complete_transcription(
    ...,
    segments_json={"segments": transcription_result.segments},
    speakers_json=artifacts.speakers,
    turns_json=artifacts.turns,
    ...
)
```

Update `complete_transcription()` to persist the two new JSON fields and stop writing `transcript_text`. Keep failure behavior unchanged.

**Step 4: Run test to verify it passes**

Run: `uv run pytest -q backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py -k "speaker or transcript"`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/worker/engine.py backend/src/worker/main.py backend/src/services/jobs.py backend/tests/unit/test_jobs.py backend/tests/integration/test_worker_runtime.py
git commit -m "feat: persist speaker turns"
```

### Task 5: Expose Speaker Metadata And Rename API

**Files:**
- Modify: `backend/src/api/schemas.py`
- Modify: `backend/src/api/routes/transcriptions.py`
- Create: `backend/src/services/speakers.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`
- Test: `backend/tests/unit/test_speakers.py`

**Step 1: Write the failing tests**

Add API tests that prove:
- `GET /transcriptions/{id}` returns `speakers` and `turns`
- `PATCH /transcriptions/{id}/speakers/{speaker_key}` renames one speaker within that transcription
- rename returns `404` for unknown transcription or speaker key
- rename returns `409` when the transcription is still processing

Example:

```python
response = await api_client.patch(
    f"/transcriptions/{transcription_id}/speakers/speaker_0",
    json={"display_name": "Alice"},
)

assert response.status_code == 200
payload = response.json()
assert payload["speakers"][0]["display_name"] == "Alice"
assert payload["turns"][0]["speaker_key"] == "speaker_0"
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest -q backend/tests/integration/test_api_transcriptions.py backend/tests/unit/test_speakers.py -k "speaker"`

Expected: FAIL because the response schema and rename service do not exist.

**Step 3: Write minimal implementation**

Add schema types:

```python
class SpeakerResponse(BaseModel):
    speaker_key: str
    display_name: str


class TurnResponse(BaseModel):
    speaker_key: str
    start: float
    end: float
    text: str
```

Expose them on `TranscriptionResponse`:

```python
class TranscriptionResponse(BaseModel):
    ...
    speakers: list[SpeakerResponse] | None = None
    turns: list[TurnResponse] | None = None
```

Add a small service layer that:
- locks the transcription row
- rejects in-flight renames for `PROCESSING`
- updates `speakers_json`
- commits and returns the refreshed transcription

The API should not rebuild or persist a separate transcript text blob. Any later plain-text rendering should be derived from `turns` outside this storage contract.

Keep the API backend-only. No frontend work in this plan.

**Step 4: Run test to verify it passes**

Run: `uv run pytest -q backend/tests/integration/test_api_transcriptions.py backend/tests/unit/test_speakers.py -k "speaker"`

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/api/schemas.py backend/src/api/routes/transcriptions.py backend/src/services/speakers.py backend/tests/integration/test_api_transcriptions.py backend/tests/unit/test_speakers.py
git commit -m "feat: add speaker rename api"
```

### Task 6: End-To-End Verification And Docs Cleanup

**Files:**
- Modify: `backend/README.md`
- Modify: `backend/tests/integration/test_container_commands.md`
- Modify: `docs/plans/2026-03-08-speaker-diarization-plan.md`

**Step 1: Write the final verification checklist**

Add a short “done means” section to the README or plan notes:
- completed transcriptions include `segments_json`, `speakers`, and `turns`
- renaming a speaker updates only that transcription
- no test requires live model downloads

**Step 2: Run focused test commands**

Run:
- `uv run pytest -q backend/tests/unit/test_transcript_assembly.py`
- `uv run pytest -q backend/tests/unit/test_diarization.py backend/tests/unit/test_speakers.py backend/tests/unit/test_jobs.py`
- `uv run pytest -q backend/tests/integration/test_api_transcriptions.py backend/tests/integration/test_worker_runtime.py backend/tests/integration/test_migrations.py`

Expected: PASS

**Step 3: Run the full backend test suite**

Run: `cd backend && uv run pytest -q`

Expected: PASS

**Step 4: Smoke-check container config**

Run: `docker compose config`

Expected: the `worker` service includes diarization env vars and the existing local upload mount remains intact.

**Step 5: Commit**

```bash
git add backend/README.md backend/tests/integration/test_container_commands.md docs/plans/2026-03-08-speaker-diarization-plan.md
git commit -m "docs: document speaker-aware transcription"
```

## Notes For The Implementer

- Keep diarization logic isolated from ASR logic. Do not bake speaker assignment into `FasterWhisperEngine`.
- Do not make tests depend on Hugging Face downloads. Fake the diarization pipeline in tests.
- Prefer canonical `speaker_key` values in storage and derive display names from `speakers_json`.
- Keep `segments_json` intact for debugging and future engine swaps; `turns_json` is the user-facing speaker-aware structure.
- Do not split turns on punctuation or raw Whisper segment boundaries. Split only when the speaker changes.
- If rename semantics become more complex later, add a dedicated `transcription_speakers` table. For now, JSON fields are sufficient and lower-friction.
