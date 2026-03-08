FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy shared dependency first
COPY shared/ /app/shared/

# Copy api project
COPY api/ /app/api/

WORKDIR /app/api
RUN uv sync --frozen

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
