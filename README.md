# picasso

A small web demo of Google Magenta's pretrained **arbitrary image
stylization** network. The interesting part is the model, not this UI — the
goal of this repo is to make it easy to try the model on your own images and
to be honest about what it can and can't do.

> Ghiasi, Lee, Kudlur, Dumoulin & Shlens.
> *"Exploring the structure of a real-time, arbitrary neural artistic
> stylization network."* BMVC, 2017.
> [arXiv:1705.06830](https://arxiv.org/abs/1705.06830)

## What this is

- A FastAPI backend that loads
  [`google/arbitrary-image-stylization-v1`](https://www.kaggle.com/models/google/arbitrary-image-stylization-v1)
  via TF-Hub / KaggleHub and exposes a `/stylize` endpoint.
- A React (Vite) frontend that lets you upload a content image, pick a style
  image from a small curated set, and download the result.
- A reference for the model that the
  [TensorFlow neural style transfer tutorial](https://www.tensorflow.org/tutorials/generative/style_transfer)
  walks through.

## What the model actually does

A style-prediction subnetwork extracts a 100-dimensional embedding from the
style image, and a transfer subnetwork composes that embedding with the
content image in a single forward pass. It is fast (sub-second on CPU for the
default size), but it has real limits:

- **Texture, not semantics.** It transfers brushwork, palette and edge
  statistics. It does not understand composition, faces, or what's *in* the
  painting. Don't expect a Picasso, expect a Picasso-textured version of
  your photo.
- **Resolution.** This codebase resizes the long edge of inputs to **512 px**
  before inference by default (see [`stylize/utils.py`](stylize/utils.py)).
  The network is fully convolutional, so this is configurable via
  `PICASSO_INFERENCE_MAX_DIMENSION` (see below), but going much above
  ~1024 px gives diminishing visual returns because the model was trained
  at 256×256.
- **2017 architecture.** It predates diffusion. Expect softening of fine
  detail, occasional color drift, and texture leaking into flat regions.

## Run with Docker

The Docker setup builds the React app and serves it from the FastAPI
container. It builds for your machine's native architecture, so Apple Silicon
and other ARM64 machines run without amd64 emulation. The compose file is
pinned to `linux/arm64/v8`, which matches OCI Ampere A1.

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

## Run locally

Use Python 3.10. Install requirements and start the backend:

```sh
poetry install
poetry run python -m uvicorn app:app
```

In a separate shell, install and start the frontend:

```sh
cd app
npm install
npm run dev
```

The dev server proxies `/stylize`, `/styles`, and `/healthz` to the FastAPI
backend on `:8000`.

## Configuration

```sh
PICASSO_MODEL_DIR=/path/to/saved_model       # skip the Kaggle download
PICASSO_CORS_ORIGINS=https://your-domain     # comma-separated
PICASSO_MAX_UPLOAD_BYTES=10485760            # 10 MB
PICASSO_MAX_IMAGE_PIXELS=12000000            # input pixel cap (validation)
PICASSO_INFERENCE_MAX_DIMENSION=512          # long-edge size at inference
KAGGLEHUB_CACHE=/model-cache
```

`PICASSO_INFERENCE_MAX_DIMENSION` controls how large inputs are resized to
before the forward pass. 512 is the default; 768–1024 are reasonable on a
4-core ARM instance if you want larger output, at the cost of latency and
RAM. Rough scaling: doubling the long edge ~4× the inference cost.

This same env var is read **twice**:

- **At runtime by the Python backend**, in [`stylize/utils.py`](stylize/utils.py),
  to control the actual resize behavior.
- **At build time by Vite**, in [`app/vite.config.ts`](app/vite.config.ts), to
  bake the value into the displayed UI copy ("inputs are resized to N px").

The Docker setup wires both through a single shell variable. To deploy at a
different resolution:

```sh
PICASSO_INFERENCE_MAX_DIMENSION=1024 docker compose up --build
```

For local dev, set it in both shells (frontend build and backend run):

```sh
# backend
PICASSO_INFERENCE_MAX_DIMENSION=1024 poetry run python -m uvicorn app:app

# frontend
PICASSO_INFERENCE_MAX_DIMENSION=1024 npm run build   # or `npm run dev`
```

If the React app is served by the same FastAPI container,
`PICASSO_CORS_ORIGINS` can be the public origin of that container. If you
put a load balancer or reverse proxy in front of it, use the HTTPS origin
that browsers see.

## Credits

- **Model & paper:** Ghiasi et al., 2017
  ([arXiv:1705.06830](https://arxiv.org/abs/1705.06830)).
- **Pretrained weights:**
  [`google/arbitrary-image-stylization-v1`](https://www.kaggle.com/models/google/arbitrary-image-stylization-v1)
  by the Google Magenta team.
- **Reference walk-through:**
  [TensorFlow neural style transfer tutorial](https://www.tensorflow.org/tutorials/generative/style_transfer).
