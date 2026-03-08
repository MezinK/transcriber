FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.6.9 /uv /uvx /bin/

# Create non-root user early (P10)
RUN useradd --create-home --no-log-init appuser

WORKDIR /app

# Copy shared dependency first (needed for path dependency resolution)
COPY shared/ /app/shared/

# Copy api dependency manifests for layer caching
COPY api/pyproject.toml api/uv.lock /app/api/
COPY api/src/api/__init__.py /app/api/src/api/__init__.py

# Install dependencies (cached unless pyproject.toml/uv.lock change)
WORKDIR /app/api
RUN uv sync --frozen

# Now copy the rest of the source code
COPY api/src/ /app/api/src/

# Ensure the app user owns the workdir and uploads
RUN mkdir -p /uploads && chown -R appuser:appuser /app /uploads

USER appuser

EXPOSE 8000

VOLUME /uploads

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
