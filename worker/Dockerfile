FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.6.9 /uv /uvx /bin/

# Create non-root user early (P10)
RUN useradd --create-home --no-log-init appuser

WORKDIR /app

# Copy shared dependency first (needed for path dependency resolution)
COPY shared/ /app/shared/

# Copy worker dependency manifests for layer caching
COPY worker/pyproject.toml worker/uv.lock /app/worker/
COPY worker/src/worker/__init__.py /app/worker/src/worker/__init__.py

# Install dependencies (cached unless pyproject.toml/uv.lock change)
WORKDIR /app/worker
RUN uv sync --frozen

# Now copy the rest of the source code
COPY worker/src/ /app/worker/src/

# Ensure the app user owns the workdir and uploads
RUN mkdir -p /uploads && chown -R appuser:appuser /app /uploads

USER appuser

VOLUME /uploads

CMD ["uv", "run", "python", "-m", "worker.main"]
