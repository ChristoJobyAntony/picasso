"""Static file server for the Picasso SPA.

Inference moved to the browser (TensorFlow.js); the backend's only job now is
to serve the built React app, the converted model files, and the style image
assets. See README for the migration history.
"""

from pathlib import Path

import fastapi
from fastapi import HTTPException
from starlette.responses import FileResponse


app = fastapi.FastAPI(docs_url=None, redoc_url=None)


ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_BUILD_PATH = ROOT_DIR / "app" / "build"

STATIC_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
LONG_CACHE = "public, max-age=604800"  # 7 days
HTML_NO_CACHE = "no-cache"
ASSET_SHORT_CACHE = "public, max-age=300"


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    """Serve the bundled React app and its static assets."""
    index_path = FRONTEND_BUILD_PATH / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_path = (FRONTEND_BUILD_PATH / full_path).resolve()
    try:
        requested_path.relative_to(FRONTEND_BUILD_PATH.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    if full_path and requested_path.is_file():
        # Vite hashes filenames in /assets so they're safely immutable.
        # /model and /styles live at fixed paths but rarely change; a week's
        # cache is a fair compromise between bandwidth and update propagation.
        if full_path.startswith("assets/"):
            cache_control = STATIC_IMMUTABLE_CACHE
        elif full_path.startswith("model/") or full_path.startswith("styles/"):
            cache_control = LONG_CACHE
        else:
            cache_control = ASSET_SHORT_CACHE
        return FileResponse(
            requested_path,
            headers={"Cache-Control": cache_control},
        )

    return FileResponse(index_path, headers={"Cache-Control": HTML_NO_CACHE})
