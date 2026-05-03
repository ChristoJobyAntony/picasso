# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS frontend

WORKDIR /frontend

# Build-time pin of the model's long-edge inference size. Same env var the
# Python backend reads at runtime, so a single value drives both the actual
# resize behavior and the displayed copy.
ARG PICASSO_INFERENCE_MAX_DIMENSION=512
ENV PICASSO_INFERENCE_MAX_DIMENSION=$PICASSO_INFERENCE_MAX_DIMENSION

COPY app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY app/ ./
RUN npm run build


FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TF_CPP_MIN_LOG_LEVEL=2 \
    KAGGLEHUB_CACHE=/model-cache

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin appuser \
    && mkdir -p /model-cache \
    && chown -R appuser:appuser /app /model-cache

COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY app.py ./app.py
COPY stylize ./stylize
COPY --from=frontend /frontend/build ./app/build

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=5).read()"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
