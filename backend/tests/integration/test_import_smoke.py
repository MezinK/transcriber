from __future__ import annotations

import importlib
from pathlib import Path


def test_new_backend_imports_resolve_from_backend_project():
    backend_root = Path(__file__).resolve().parents[2]

    api_main = importlib.import_module("api.main")
    worker_main = importlib.import_module("worker.main")
    services_jobs = importlib.import_module("services.jobs")
    infra_models = importlib.import_module("infra.models")

    assert str(Path(api_main.__file__).resolve()).startswith(str(backend_root / "src"))
    assert str(Path(worker_main.__file__).resolve()).startswith(
        str(backend_root / "src")
    )
    assert str(Path(services_jobs.__file__).resolve()).startswith(
        str(backend_root / "src")
    )
    assert str(Path(infra_models.__file__).resolve()).startswith(
        str(backend_root / "src")
    )
