FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy shared dependency first
COPY shared/ /app/shared/

# Copy worker project
COPY worker/ /app/worker/

WORKDIR /app/worker
RUN uv sync --frozen

CMD ["uv", "run", "python", "-m", "worker.main"]
