FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860 \
    APP_REQUIRE_AUTH=true \
    APP_USERNAME=group
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml README.md LICENSE ./
COPY src/ ./src/
RUN pip install --no-cache-dir .
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist
EXPOSE 7860
CMD ["sh", "-c", "uvicorn sgd_api.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
