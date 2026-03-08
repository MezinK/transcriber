from pathlib import Path
import uuid

from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio

from api.main import create_app
from infra.config import reset_settings_cache
from infra.db import get_session_factory, reset_db_caches
from infra.models import JobLease, MediaType, Transcription, TranscriptionArtifact
from services.jobs import claim_next_transcription


@pytest_asyncio.fixture
async def api_client(postgres_database, tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setenv("DATABASE_URL", postgres_database.database_url)
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    reset_settings_cache()
    await reset_db_caches()

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    await reset_db_caches()
    reset_settings_cache()


@pytest_asyncio.fixture
async def limited_api_client(postgres_database, tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setenv("DATABASE_URL", postgres_database.database_url)
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "1")
    reset_settings_cache()
    await reset_db_caches()

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    await reset_db_caches()
    reset_settings_cache()


@pytest.mark.asyncio
async def test_upload_creates_transcription_and_artifact_record(api_client):
    response = await api_client.post(
        "/transcriptions/",
        files={"file": ("meeting.wav", b"hello world", "audio/wav")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["source_filename"] == "meeting.wav"
    assert payload["status"] == "pending"

    session_factory = get_session_factory()
    async with session_factory() as session:
        transcription = await session.get(Transcription, uuid.UUID(payload["id"]))
        artifact = await session.get(TranscriptionArtifact, uuid.UUID(payload["id"]))
        assert transcription is not None
        assert transcription.media_type == MediaType.AUDIO
        assert artifact is not None
        assert Path(artifact.upload_path).exists()


@pytest.mark.asyncio
async def test_list_and_fetch_transcriptions(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("episode.webm", b"payload", "video/webm")},
    )
    transcription_id = create_response.json()["id"]

    list_response = await api_client.get("/transcriptions/")
    fetch_response = await api_client.get(f"/transcriptions/{transcription_id}")

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["id"] == transcription_id
    assert fetch_response.status_code == 200
    assert fetch_response.json()["id"] == transcription_id
    assert fetch_response.json()["speakers"] is None
    assert fetch_response.json()["turns"] is None


@pytest.mark.asyncio
async def test_fetch_returns_speakers_and_turns_when_present(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("episode.webm", b"payload", "video/webm")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    session_factory = get_session_factory()
    async with session_factory() as session:
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        assert artifact is not None
        artifact.speakers_json = [
            {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
        ]
        artifact.turns_json = [
            {
                "speaker_key": "speaker_0",
                "start": 0.0,
                "end": 1.0,
                "text": "Hello world",
            }
        ]
        await session.commit()

    response = await api_client.get(f"/transcriptions/{transcription_id}")

    assert response.status_code == 200
    assert response.json()["speakers"] == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
    ]
    assert response.json()["turns"] == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 1.0,
            "text": "Hello world",
        }
    ]


@pytest.mark.asyncio
async def test_patch_renames_speaker_within_transcription(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("rename.wav", b"payload", "audio/wav")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    session_factory = get_session_factory()
    async with session_factory() as session:
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        assert artifact is not None
        artifact.speakers_json = [
            {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
        ]
        artifact.turns_json = [
            {
                "speaker_key": "speaker_0",
                "start": 0.0,
                "end": 1.0,
                "text": "Hello world",
            }
        ]
        await session.commit()

    response = await api_client.patch(
        f"/transcriptions/{transcription_id}/speakers/speaker_0",
        json={"display_name": "Alice"},
    )

    assert response.status_code == 200
    assert response.json()["speakers"] == [
        {"speaker_key": "speaker_0", "display_name": "Alice"}
    ]
    assert response.json()["turns"] == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 1.0,
            "text": "Hello world",
        }
    ]


@pytest.mark.asyncio
async def test_patch_rename_returns_404_for_unknown_speaker(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("rename.wav", b"payload", "audio/wav")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    response = await api_client.patch(
        f"/transcriptions/{transcription_id}/speakers/speaker_missing",
        json={"display_name": "Alice"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Speaker not found"}


@pytest.mark.asyncio
async def test_patch_rename_returns_409_while_processing(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("rename.wav", b"payload", "audio/wav")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    session_factory = get_session_factory()
    async with session_factory() as session:
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        assert artifact is not None
        artifact.speakers_json = [
            {"speaker_key": "speaker_0", "display_name": "Speaker 1"}
        ]
        await session.commit()

    await claim_next_transcription(
        session_factory=session_factory,
        worker_id=uuid.uuid4(),
        lease_duration_seconds=120,
    )

    response = await api_client.patch(
        f"/transcriptions/{transcription_id}/speakers/speaker_0",
        json={"display_name": "Alice"},
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "Transcription is currently being processed"}


@pytest.mark.asyncio
async def test_delete_returns_409_while_leased(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("lease.wav", b"payload", "audio/wav")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    session_factory = get_session_factory()
    async with session_factory() as session:
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        assert artifact is not None
        file_path = Path(artifact.upload_path)

    await claim_next_transcription(
        session_factory=session_factory,
        worker_id=uuid.uuid4(),
        lease_duration_seconds=120,
    )

    response = await api_client.delete(f"/transcriptions/{transcription_id}")

    assert response.status_code == 409
    assert file_path.exists() is True

    async with session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        lease = await session.get(JobLease, transcription_id)

    assert transcription is not None
    assert lease is not None


@pytest.mark.asyncio
async def test_delete_removes_transcription_and_file(api_client):
    create_response = await api_client.post(
        "/transcriptions/",
        files={"file": ("delete.wav", b"payload", "audio/wav")},
    )
    transcription_id = uuid.UUID(create_response.json()["id"])

    session_factory = get_session_factory()
    async with session_factory() as session:
        artifact = await session.get(TranscriptionArtifact, transcription_id)
        file_path = Path(artifact.upload_path)

    response = await api_client.delete(f"/transcriptions/{transcription_id}")

    assert response.status_code == 204
    assert not file_path.exists()

    async with session_factory() as session:
        transcription = await session.get(Transcription, transcription_id)
        assert transcription is None


@pytest.mark.asyncio
async def test_upload_unsupported_extension_returns_400(api_client):
    response = await api_client.post(
        "/transcriptions/",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Unsupported file type: .txt"}


@pytest.mark.asyncio
async def test_upload_oversized_payload_returns_413(limited_api_client):
    response = await limited_api_client.post(
        "/transcriptions/",
        files={"file": ("too-big.wav", b"ab", "audio/wav")},
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "File too large. Maximum size: 0 MB"}
