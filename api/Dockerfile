FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

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

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
