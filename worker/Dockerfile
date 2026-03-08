FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

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

CMD ["uv", "run", "python", "-m", "worker.main"]
