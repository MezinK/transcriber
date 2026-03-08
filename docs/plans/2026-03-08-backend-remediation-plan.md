# Backend Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the backend correctness and safety issues from the review while preserving the current same-machine Postgres deployment model and allowing Hugging Face model downloads.

**Architecture:** Keep the existing FastAPI + SQLAlchemy + worker structure, but tighten the boundaries around deletion, upload validation, and worker recovery. The main changes are: collapse delete precheck and delete into one transactional service call, only unlink files that resolve under the configured upload root, translate upload validation failures into 4xx responses, and run stale-lease recovery even when the queue stays busy.

**Tech Stack:** FastAPI, SQLAlchemy asyncio, Alembic, pytest, httpx, Docker Compose, faster-whisper

---

### Task 1: Translate invalid uploads into explicit client errors

**Files:**
- Modify: `backend/src/services/storage.py`
- Modify: `backend/src/services/uploads.py`
- Modify: `backend/src/api/routes/transcriptions.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`
- Test: `backend/tests/unit/test_uploads.py`

**Step 1: Write the failing API tests**

Add two integration tests to `backend/tests/integration/test_api_transcriptions.py`:

```python
@pytest.mark.asyncio
async def test_upload_rejects_unsupported_extension(api_client):
    response = await api_client.post(
        "/transcriptions/",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unsupported file type: .txt"}


@pytest.mark.asyncio
async def test_upload_rejects_oversized_payload(api_client, monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "4")
    reset_settings_cache()

    response = await api_client.post(
        "/transcriptions/",
        files={"file": ("meeting.wav", b"hello", "audio/wav")},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "File too large. Maximum size: 0 MB"}
```

**Step 2: Run the targeted API tests and verify they fail**

Run: `uv run pytest -q tests/integration/test_api_transcriptions.py -k "unsupported_extension or oversized_payload"`

Expected: failures showing the route still returns `500`.

**Step 3: Introduce typed upload exceptions**

Add explicit exception types in `backend/src/services/storage.py` and `backend/src/services/uploads.py`:

```python
class UploadValidationError(ValueError):
    pass


class UploadTooLargeError(UploadValidationError):
    pass
```

Raise `UploadValidationError` for missing filenames and unsupported extensions, and raise `UploadTooLargeError` for size overflow.

**Step 4: Map service exceptions to HTTP errors**

Update `backend/src/api/routes/transcriptions.py` so `upload_transcription()` translates:

```python
except UploadTooLargeError as exc:
    raise HTTPException(status_code=413, detail=str(exc)) from None
except UploadValidationError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from None
```

**Step 5: Add a unit-level regression for the new exception types**

Extend `backend/tests/unit/test_uploads.py` so the existing bad-input tests assert the new typed exceptions instead of generic `ValueError`.

**Step 6: Re-run the targeted tests**

Run: `uv run pytest -q tests/unit/test_uploads.py tests/integration/test_api_transcriptions.py -k "unsupported_extension or oversized_payload or create_upload"`

Expected: passing tests.

**Step 7: Commit**

```bash
git add backend/src/services/storage.py backend/src/services/uploads.py backend/src/api/routes/transcriptions.py backend/tests/unit/test_uploads.py backend/tests/integration/test_api_transcriptions.py
git commit -m "fix: return client errors for invalid uploads"
```

### Task 2: Make transcription deletion atomic with lease checks

**Files:**
- Modify: `backend/src/services/uploads.py`
- Modify: `backend/src/api/routes/transcriptions.py`
- Modify: `backend/src/services/jobs.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`
- Test: `backend/tests/integration/test_job_lifecycle.py`

**Step 1: Write the failing regression tests**

Add an integration test to `backend/tests/integration/test_api_transcriptions.py` that proves an actively leased job still returns `409`.

Add a lifecycle-level concurrency regression in `backend/tests/integration/test_job_lifecycle.py` that exercises the delete path and claim path against the same transcription using two async tasks.

The regression should prove this sequence fails before the fix:

```python
1. begin delete request
2. claim the transcription in a second task before delete commits
3. observe delete succeeds and worker lease/file are removed incorrectly
```

**Step 2: Run the targeted regression tests and verify the race exists**

Run: `uv run pytest -q tests/integration/test_api_transcriptions.py -k leased tests/integration/test_job_lifecycle.py -k delete`

Expected: at least one failing or newly added xfail-style regression showing the delete window.

**Step 3: Replace the two-step delete flow with one transactional service**

In `backend/src/services/uploads.py`, replace `delete_upload()` with a single service that:

```python
async def delete_transcription_if_unleased(...):
    async with session_factory() as session:
        result = await session.execute(
            select(Transcription)
            .options(selectinload(Transcription.artifact), selectinload(Transcription.lease))
            .where(Transcription.id == transcription_id)
            .with_for_update()
        )
        transcription = result.scalar_one_or_none()
        if transcription is None:
            return DeleteResult.NOT_FOUND
        if transcription.lease is not None:
            return DeleteResult.LEASED

        upload_path = transcription.artifact.upload_path if transcription.artifact else None
        await session.delete(transcription)
        await session.commit()
        return DeleteResult.DELETED, upload_path
```

**Step 4: Simplify the route to use the transactional service directly**

Update `backend/src/api/routes/transcriptions.py` so the route does not call `ensure_transcription_deletable()` first. The route should branch only on the result enum from the new service: `404`, `409`, or `204`.

**Step 5: Remove the obsolete precheck helper if no longer needed**

Delete `ensure_transcription_deletable()` and `TranscriptionDeletionConflictError` from `backend/src/services/jobs.py` if they have no remaining callers.

**Step 6: Re-run the targeted deletion tests**

Run: `uv run pytest -q tests/integration/test_api_transcriptions.py tests/integration/test_job_lifecycle.py -k "delete or leased"`

Expected: passing tests with the race closed.

**Step 7: Commit**

```bash
git add backend/src/services/uploads.py backend/src/api/routes/transcriptions.py backend/src/services/jobs.py backend/tests/integration/test_api_transcriptions.py backend/tests/integration/test_job_lifecycle.py
git commit -m "fix: make transcription deletion atomic"
```

### Task 3: Restrict file cleanup to the managed upload root

**Files:**
- Modify: `backend/src/services/storage.py`
- Modify: `backend/src/services/uploads.py`
- Modify: `backend/src/services/jobs.py`
- Test: `backend/tests/unit/test_uploads.py`
- Test: `backend/tests/unit/test_jobs.py`

**Step 1: Write the failing safety tests**

Add unit tests that verify no file is unlinked when `upload_path` points outside the configured upload directory:

```python
def test_remove_managed_file_rejects_path_outside_upload_root(tmp_path):
    upload_root = tmp_path / "uploads"
    other_file = tmp_path / "outside.txt"
    other_file.write_text("keep me")

    removed = remove_managed_file(upload_root=upload_root, stored_path=other_file)

    assert removed is False
    assert other_file.exists()
```

Add `jobs.py` tests that monkeypatch the new helper and assert `complete_transcription()`, `fail_transcription()`, and `recover_stale_leases()` use it.

**Step 2: Run the targeted safety tests and verify they fail**

Run: `uv run pytest -q tests/unit/test_uploads.py tests/unit/test_jobs.py`

Expected: failures because the code still calls `Path.unlink()` directly.

**Step 3: Add a managed cleanup helper**

Implement a helper in `backend/src/services/storage.py`:

```python
def remove_managed_file(*, upload_root: Path, stored_path: str | Path) -> bool:
    root = upload_root.resolve()
    candidate = Path(stored_path).resolve()
    if candidate != root and root not in candidate.parents:
        return False
    candidate.unlink(missing_ok=True)
    return True
```

Use `logging.getLogger(__name__)` to warn when cleanup is skipped because the path is outside the managed root.

**Step 4: Thread `upload_dir` into all cleanup call sites**

Update `delete_transcription_if_unleased()`, `complete_transcription()`, `fail_transcription()`, and `recover_stale_leases()` so they receive `upload_dir` and call `remove_managed_file()` instead of `remove_file()`.

**Step 5: Re-run the targeted tests**

Run: `uv run pytest -q tests/unit/test_uploads.py tests/unit/test_jobs.py`

Expected: passing tests.

**Step 6: Commit**

```bash
git add backend/src/services/storage.py backend/src/services/uploads.py backend/src/services/jobs.py backend/tests/unit/test_uploads.py backend/tests/unit/test_jobs.py
git commit -m "fix: only delete files under the upload root"
```

### Task 4: Recover stale leases even while the queue stays busy

**Files:**
- Modify: `backend/src/worker/main.py`
- Test: `backend/tests/integration/test_worker_runtime.py`

**Step 1: Write the failing worker regression**

Add an integration test to `backend/tests/integration/test_worker_runtime.py` with:

```python
1. a stale lease owned by worker A
2. a separate pending transcription available for worker B
3. worker B runs one loop iteration while work exists
4. the stale lease is requeued or failed during that busy iteration
```

The test should fail against the current implementation because `recover_stale_leases()` only runs on idle loops.

**Step 2: Run the targeted worker regression**

Run: `uv run pytest -q tests/integration/test_worker_runtime.py -k stale`

Expected: failure demonstrating the stale lease remains untouched while the worker keeps processing backlog.

**Step 3: Move stale-lease recovery into the hot path**

Update `backend/src/worker/main.py` so each loop iteration performs:

```python
await recover_stale_leases(...)
processed = await self.run_once()
if processed:
    continue
await heartbeat_worker(...)
```

If that causes too much write traffic, add a `last_recovery_at` timestamp and only recover once per poll interval, but keep it independent of queue idleness.

**Step 4: Re-run the targeted worker test**

Run: `uv run pytest -q tests/integration/test_worker_runtime.py -k "stale or shutdown"`

Expected: passing tests.

**Step 5: Commit**

```bash
git add backend/src/worker/main.py backend/tests/integration/test_worker_runtime.py
git commit -m "fix: recover stale leases during busy worker loops"
```

### Task 5: Make the local default upload directory safe for non-container runs

**Files:**
- Modify: `backend/src/infra/config.py`
- Modify: `backend/README.md`
- Test: `backend/tests/unit/test_config.py`

**Step 1: Write the failing config test**

Change the default-path expectation in `backend/tests/unit/test_config.py` from `/uploads` to a project-local path such as:

```python
assert settings.upload_dir.endswith("var/uploads")
```

**Step 2: Run the targeted config test and verify it fails**

Run: `uv run pytest -q tests/unit/test_config.py`

Expected: failure because the default is still `/uploads`.

**Step 3: Switch the default to a local writable path**

Update `backend/src/infra/config.py` to compute a default such as:

```python
DEFAULT_UPLOAD_DIR = str((Path(__file__).resolve().parents[2] / "var" / "uploads"))
```

Keep `docker-compose.yml` unchanged because it already sets `UPLOAD_DIR=/uploads` for containers.

**Step 4: Document the split between local runs and containers**

Update `backend/README.md` to state:

```markdown
- local development defaults to `backend/var/uploads`
- Docker Compose overrides uploads to the mounted `/uploads` volume
- same-machine Postgres is supported; cloud/remote DBs are not a supported deployment target
```

**Step 5: Re-run the targeted config/doc-adjacent tests**

Run: `uv run pytest -q tests/unit/test_config.py tests/integration/test_api_transcriptions.py -k upload`

Expected: passing tests.

**Step 6: Commit**

```bash
git add backend/src/infra/config.py backend/README.md backend/tests/unit/test_config.py
git commit -m "chore: use safer local upload defaults"
```

### Task 6: Run the full verification pass

**Files:**
- Test: `backend/tests/unit/test_uploads.py`
- Test: `backend/tests/unit/test_jobs.py`
- Test: `backend/tests/unit/test_workers.py`
- Test: `backend/tests/unit/test_config.py`
- Test: `backend/tests/integration/test_api_transcriptions.py`
- Test: `backend/tests/integration/test_api_workers.py`
- Test: `backend/tests/integration/test_job_lifecycle.py`
- Test: `backend/tests/integration/test_worker_runtime.py`
- Test: `backend/tests/integration/test_worker_visibility.py`
- Test: `backend/tests/integration/test_migrations.py`
- Test: `backend/tests/integration/test_import_smoke.py`

**Step 1: Run the full backend suite**

Run: `uv run pytest -q`

Expected: all tests pass.

**Step 2: Smoke-check the compose topology assumptions**

Run: `docker compose config`

Expected: `api`, `worker`, `migrate`, and `postgres` still resolve with `UPLOAD_DIR=/uploads` in containers.

**Step 3: Review the diff for accidental scope creep**

Run: `git diff --stat`

Expected: changes limited to upload validation, deletion flow, worker recovery, config defaults, docs, and tests.

**Step 4: Commit the verification-clean state**

```bash
git add backend/src backend/tests backend/README.md docs/plans/2026-03-08-backend-remediation-plan.md
git commit -m "plan: document backend remediation work"
```

## Notes

- Dropped from scope after clarification: removing same-machine Postgres, and blocking Hugging Face model downloads.
- Deferred unless you want a stricter deployment policy later: programmatic detection of “same-machine” database URLs. In Docker Compose, a service hostname like `postgres` is same-machine in practice but not distinguishable from a remote hostname by simple URL parsing.
