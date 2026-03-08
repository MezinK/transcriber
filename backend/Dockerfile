FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.6.9 /uv /uvx /bin/

RUN useradd --create-home --no-log-init appuser

WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock /app/backend/
COPY backend/src/api/__init__.py /app/backend/src/api/__init__.py
COPY backend/src/services/__init__.py /app/backend/src/services/__init__.py
COPY backend/src/infra/__init__.py /app/backend/src/infra/__init__.py
COPY backend/src/worker/__init__.py /app/backend/src/worker/__init__.py

RUN uv sync --frozen

COPY backend/ /app/backend/

RUN mkdir -p /uploads && chown -R appuser:appuser /app /uploads

USER appuser

VOLUME /uploads
