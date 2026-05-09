# picasso

A small web demo of Google Magenta's pretrained **arbitrary image
stylization** network — running entirely in the browser. The Python backend
is now just a static file server; all inference happens client-side via
TensorFlow.js.

> Ghiasi, Lee, Kudlur, Dumoulin & Shlens.
> *"Exploring the structure of a real-time, arbitrary neural artistic
> stylization network."* BMVC, 2017.
> [arXiv:1705.06830](https://arxiv.org/abs/1705.06830)

## Architecture

- **Frontend** ([app/](app/)) — React + Vite. Loads the converted TF.js
  GraphModel from `/model/`, runs inference on a WebGL backend, draws to a
  canvas.
- **Backend** ([app.py](app.py)) — FastAPI. Serves the SPA build, the
  converted model files, and the style image catalog. No model loading, no
  upload endpoints, no CORS.
- **Model assets** — Live under [app/public/model/](app/public/model/) (the
  converted GraphModel, ~30 MB) and [app/public/styles/](app/public/styles/)
  (style image JPEGs + metadata).

## What the model actually does

A style-prediction subnetwork extracts a 100-dimensional embedding from the
style image, and a transfer subnetwork composes that embedding with the
content image in a single forward pass. Honest limits:

- **Texture, not semantics.** It transfers brushwork, palette and edge
  statistics. It does not understand composition, faces, or what's *in* the
  painting. Don't expect a Picasso, expect a Picasso-textured version of
  your photo.
- **Resolution.** Inputs are resized to `PICASSO_INFERENCE_MAX_DIMENSION` px
  (default 512) on the long edge before inference. Going much above
  ~1024 px gives diminishing visual returns because the model was trained
  at 256×256 — and on phones, larger sizes can hit WebGL memory limits.
- **2017 architecture.** Predates diffusion. Expect softening of fine
  detail, occasional color drift, and texture leaking into flat regions.
- **Browser variance.** A modern desktop with a discrete GPU runs a
  stylization in 200–600 ms; a mid-range phone takes 1–3 s; older devices
  may OOM at higher resolutions.

## Run with Docker

```sh
docker compose up --build
```

Then open http://localhost:8000. To run at a different inference resolution:

```sh
PICASSO_INFERENCE_MAX_DIMENSION=1024 docker compose up --build
```

The runtime image is now a thin Python static server (~80 MB, no
TensorFlow) — no model download on startup, no Kaggle credentials needed.

## Run locally

In one shell, start the backend (Python 3.12+):

```sh
poetry install
poetry run python -m uvicorn app:app
```

In another, start the frontend dev server:

```sh
cd app
npm install
npm run dev
```

The dev server proxies `/healthz` to FastAPI on `:8000`. Everything else
(model, styles, SPA) is served by Vite directly out of `app/public/`.

## Configuration

```sh
PICASSO_INFERENCE_MAX_DIMENSION=512   # long-edge size at inference
```

Read **at build time** by Vite ([app/vite.config.ts](app/vite.config.ts)) —
the value is baked into the bundle so:

- The displayed copy ("inputs are resized to N px") is honest.
- The TF.js code in [app/src/lib/styleTransfer.ts](app/src/lib/styleTransfer.ts)
  resizes inputs to the same N before a forward pass.

The Docker setup forwards `PICASSO_INFERENCE_MAX_DIMENSION` from your shell
through to the build stage (see [docker-compose.yml](docker-compose.yml)
and the `ARG` in [Dockerfile](Dockerfile)).

## Re-converting the model

The TF.js GraphModel is checked in under [app/public/model/](app/public/model/),
so a fresh clone has everything it needs. If you want to re-convert (e.g.
to try a different quantization), here's the path that worked on Apple
Silicon — `tensorflowjs_converter` has dependency conflicts with native
arm64 wheels, so go through Linux/amd64 in Docker:

```sh
# Extract the original SavedModel from your Kaggle/Magenta cache, then:
docker run --rm --platform linux/amd64 \
  -v /path/to/saved_model:/in:ro \
  -v $(pwd)/app/public/model:/out \
  python:3.10-slim \
  bash -c "pip install --quiet tensorflowjs && \
    tensorflowjs_converter \
      --input_format=tf_saved_model \
      --output_format=tfjs_graph_model \
      --signature_name=serving_default \
      --saved_model_tags=serve \
      --quantize_float16='*' \
      /in /out"
```

The converted bundle is ~30 MB with `--quantize_float16` and ~7 MB with
`--quantize_uint8` (lower visual quality).

## Credits

- **Model & paper:** Ghiasi et al., 2017
  ([arXiv:1705.06830](https://arxiv.org/abs/1705.06830)).
- **Pretrained weights:**
  [`google/arbitrary-image-stylization-v1`](https://www.kaggle.com/models/google/arbitrary-image-stylization-v1)
  by the Google Magenta team.
- **Reference walk-through:**
  [TensorFlow neural style transfer tutorial](https://www.tensorflow.org/tutorials/generative/style_transfer).
- **Browser inference:** [TensorFlow.js](https://www.tensorflow.org/js).
