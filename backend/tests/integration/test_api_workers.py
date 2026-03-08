from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio

from api.main import create_app
from infra.config import reset_settings_cache
from infra.db import reset_db_caches
from infra.models import WorkerStatus
from services.workers import register_worker, set_worker_current_job


@pytest_asyncio.fixture
async def api_client(postgres_database, tmp_path, monkeypatch, session_factory):
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


@pytest.mark.asyncio
async def test_worker_list_endpoint_returns_ui_rows(api_client, session_factory):
    worker = await register_worker(
        session_factory=session_factory,
        worker_id=__import__('uuid').uuid4(),
        label="desktop",
    )

    response = await api_client.get("/workers/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == str(worker.id)
    assert payload["items"][0]["status"] == WorkerStatus.IDLE.value
    assert payload["items"][0]["label"] == "desktop"


@pytest.mark.asyncio
async def test_health_returns_non_200_on_db_failure(postgres_database, tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setenv("DATABASE_URL", postgres_database.database_url)
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    reset_settings_cache()
    await reset_db_caches()

    app = create_app()
    import api.main as api_main

    def broken_session_factory():
        raise RuntimeError("db unavailable")

    monkeypatch.setattr(api_main, "get_session_factory", broken_session_factory)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 503
    assert response.json() == {"status": "unhealthy"}

    await reset_db_caches()
    reset_settings_cache()
