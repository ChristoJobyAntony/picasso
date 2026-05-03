import base64
import json
import os
from pathlib import Path
from typing import Any, Dict

import stylize
import fastapi
from fastapi import File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse, FileResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from io import BytesIO


MAX_UPLOAD_BYTES = int(os.environ.get("PICASSO_MAX_UPLOAD_BYTES", 10 * 1024 * 1024))
MAX_IMAGE_PIXELS = int(os.environ.get("PICASSO_MAX_IMAGE_PIXELS", 12_000_000))
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg"}
DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("PICASSO_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]


class PayloadTooLargeError(Exception):
    pass


class MaxBodySizeMiddleware:
    def __init__(self, app: ASGIApp, max_body_size: int) -> None:
        self.app = app
        self.max_body_size = max_body_size

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        content_length = dict(scope["headers"]).get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_body_size:
                    await self._reject(send)
                    return
            except ValueError:
                pass

        bytes_read = 0

        async def limited_receive() -> Message:
            nonlocal bytes_read
            message = await receive()
            if message["type"] == "http.request":
                bytes_read += len(message.get("body", b""))
                if bytes_read > self.max_body_size:
                    raise PayloadTooLargeError
            return message

        try:
            await self.app(scope, limited_receive, send)
        except PayloadTooLargeError:
            await self._reject(send)

    async def _reject(self, send: Send) -> None:
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b'{"detail":"Request body is too large"}',
            }
        )


app = fastapi.FastAPI(docs_url=None, redoc_url=None)
model: stylize.Model | None = None


@app.on_event("startup")
def load_model() -> None:
    global model
    model = stylize.Model()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Accept", "Content-Type"],
)
app.add_middleware(MaxBodySizeMiddleware, max_body_size=MAX_UPLOAD_BYTES)


ROOT_DIR = Path(__file__).resolve().parent
STYLE_PATH = ROOT_DIR / "stylize" / "style_images"
STYLES_INFO_PATH = ROOT_DIR / "stylize" / "styles.json"
FRONTEND_BUILD_PATH = ROOT_DIR / "app" / "build"

style_info = json.loads(STYLES_INFO_PATH.read_text())
styles: Dict[str, Any] = {style["id"]: style for style in style_info}

# Load images into memory
images = {}
ids = list(styles.keys())
for id in ids:
    fp = STYLE_PATH / styles[id]["file"]
    images[id] = fp.read_bytes()


async def _read_validated_image(image: UploadFile) -> BytesIO:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Wrong file type, use png or jpeg")

    content = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")

    return BytesIO(content)


def _stylize(content: BytesIO, style: str):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is still loading")

    try:
        content_img = stylize.utils.load_img_from_bytesio(
            content,
            max_pixels=MAX_IMAGE_PIXELS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    style_img = stylize.utils.load_img_from_bytesio(BytesIO(images[style]))
    return model.stylize(content_img, style_img)


STATIC_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
HTML_NO_CACHE = "no-cache"
ASSET_SHORT_CACHE = "public, max-age=300"


@app.get("/styles/image/{image}")
def get_style_image(image: str):
    style = styles.get(image)
    if not style:
        raise HTTPException(status_code=415, detail="Style not found")
    return FileResponse(
        STYLE_PATH / style["file"],
        headers={"Cache-Control": STATIC_IMMUTABLE_CACHE},
    )


@app.get("/styles/info")
def get_styles_info():
    return style_info


@app.get("/healthz")
def healthz():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/stylizeb64")
async def upload_file_b64(style: str = Form(), image: UploadFile = File()):
    """API route to return base64 encoded stylized image.

    Parameters:
    - style : str - is a string containing the appropriate id of style image
    - image : UploadFile - contains the content image submitted by the user"""
    if not (style in ids):
        raise HTTPException(status_code=400, detail="Invalid ID")
    content = await _read_validated_image(image)
    img = _stylize(content, style)
    # Encode response as base64
    buf = stylize.utils.img_to_bytesio(img, format="PNG")
    buf = BytesIO(base64.b64encode(buf.read()))
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png;base64")


@app.post("/stylize")
async def upload_file(style: str = Form(), image: UploadFile = File()):
    """API route to return stylized image. Debug only at this point.

    Parameters:
    - style : str - is a string containing the appropriate id of style image
    - image : UploadFile - contains the content image submitted by the user"""
    if not (style in ids):
        raise HTTPException(status_code=415, detail="Invalid ID")

    content = await _read_validated_image(image)
    img = _stylize(content, style)
    buf = stylize.utils.img_to_bytesio(img, format="PNG")
    return StreamingResponse(buf, media_type="image/png")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    """Serve the bundled React app when the production build is available."""
    index_path = FRONTEND_BUILD_PATH / "index.html"
    if not index_path.is_file():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_path = (FRONTEND_BUILD_PATH / full_path).resolve()
    try:
        requested_path.relative_to(FRONTEND_BUILD_PATH.resolve())
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    if full_path and requested_path.is_file():
        # Vite emits hashed filenames into /assets, so they can be cached forever.
        cache_control = (
            STATIC_IMMUTABLE_CACHE
            if full_path.startswith("assets/")
            else ASSET_SHORT_CACHE
        )
        return FileResponse(requested_path, headers={"Cache-Control": cache_control})

    return FileResponse(index_path, headers={"Cache-Control": HTML_NO_CACHE})
