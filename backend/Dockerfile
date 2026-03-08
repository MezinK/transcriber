FROM python:3.12-slim AS backend-base

COPY --from=ghcr.io/astral-sh/uv:0.6.9 /uv /uvx /bin/

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --no-log-init appuser

WORKDIR /app/backend
ENV PATH="/app/backend/.venv/bin:$PATH"

COPY backend/pyproject.toml backend/uv.lock /app/backend/
COPY backend/src/api/__init__.py /app/backend/src/api/__init__.py
COPY backend/src/services/__init__.py /app/backend/src/services/__init__.py
COPY backend/src/infra/__init__.py /app/backend/src/infra/__init__.py
COPY backend/src/worker/__init__.py /app/backend/src/worker/__init__.py

COPY backend/ /app/backend/

RUN mkdir -p /uploads && chown -R appuser:appuser /app /uploads

FROM backend-base AS backend-api

RUN uv sync --frozen --no-dev

USER appuser

VOLUME /uploads

FROM backend-base AS backend-worker

RUN uv sync --frozen --no-dev --extra worker

USER appuser

VOLUME /uploads
