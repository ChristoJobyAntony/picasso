# picasso

The app downloads Google's arbitrary image stylization model from Kaggle on first
startup using KaggleHub:

```py
import kagglehub

path = kagglehub.model_download("google/arbitrary-image-stylization-v1/tensorFlow1/256")
print("Path to model files:", path)
```

You can still set `PICASSO_MODEL_DIR` to use a model that already exists on disk.

## Run with Docker

The Docker setup builds the React app and serves it from the FastAPI container.
It builds for your machine's native architecture, so Apple Silicon and other
ARM64 machines run without amd64 emulation.
The compose file is pinned to `linux/arm64/v8`, which matches OCI Ampere A1.

```sh
docker compose up --build
```

Then open http://localhost:8000.

If Docker previously built the old amd64 image, force a fresh ARM64 build:

```sh
docker compose build --no-cache picasso
docker compose up --force-recreate
```

The first startup downloads the model into the `picasso-model-cache` Docker
volume. Future container runs reuse that cached download.

If you are not using compose, build and run the image directly on ARM64:

```sh
docker build --platform linux/arm64 -t picasso .
docker run --rm -p 8000:8000 \
  -v picasso-model-cache:/model-cache \
  picasso
```

KaggleHub usually downloads public models without credentials. If Kaggle asks
for authentication or consent, export `KAGGLE_API_TOKEN` before starting the
container.

## Deployment Settings

Set these environment variables for production:

```sh
PICASSO_CORS_ORIGINS=https://your-domain.example
PICASSO_MAX_UPLOAD_BYTES=10485760
PICASSO_MAX_IMAGE_PIXELS=12000000
KAGGLEHUB_CACHE=/model-cache
```

If the React app is served by the same FastAPI container, `PICASSO_CORS_ORIGINS`
can be the public origin of that container. If you put a load balancer or reverse
proxy in front of it, use the HTTPS origin that browsers see.

## Run locally

Use Python 3.10. To install requirements and start the backend:

```sh
poetry install
poetry run python -m uvicorn app:app
```

To install and start the frontend web application:

```sh
cd app
npm install
npm start
```
