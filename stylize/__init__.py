import os
from pathlib import Path
from typing import Optional

import tensorflow as tf
import PIL.Image
from . import utils


MODEL_NAME = "magenta_arbitrary-image-stylization-v1-256_2"
KAGGLE_MODEL_HANDLE = "google/arbitrary-image-stylization-v1/tensorFlow1/256"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / MODEL_NAME


def _find_saved_model_path(model_root: Path) -> Optional[Path]:
    if not model_root.exists() or model_root.is_file():
        return None

    if (model_root / "saved_model.pb").is_file():
        return model_root

    for saved_model_file in sorted(model_root.rglob("saved_model.pb")):
        return saved_model_file.parent

    return None


def _download_model_from_kaggle() -> Path:
    try:
        import kagglehub
    except ImportError as exc:
        raise RuntimeError(
            "Missing TensorFlow style transfer model and kagglehub is not installed. "
            "Install kagglehub or set PICASSO_MODEL_DIR to a saved model directory."
        ) from exc

    print(f"Resolving model from Kaggle: {KAGGLE_MODEL_HANDLE}", flush=True)
    path = Path(kagglehub.model_download(KAGGLE_MODEL_HANDLE))
    print("Path to model files:", path, flush=True)

    model_path = _find_saved_model_path(path)
    if model_path is None:
        raise RuntimeError(
            f"Kaggle model download did not contain saved_model.pb under {path}"
        )

    return model_path


def _resolve_model_path() -> Path:
    configured_model_dir = os.environ.get("PICASSO_MODEL_DIR")
    if configured_model_dir:
        model_path = _find_saved_model_path(Path(configured_model_dir).expanduser())
        if model_path is None:
            raise RuntimeError(
                "PICASSO_MODEL_DIR does not point to a TensorFlow saved model: "
                f"{configured_model_dir}"
            )
        return model_path

    local_model_path = _find_saved_model_path(DEFAULT_MODEL_PATH)
    if local_model_path is not None:
        return local_model_path

    return _download_model_from_kaggle()


class Model:
    """- On init loads in the style transfer model.
    - Use the stylize method to use the model on images"""

    def __init__(self) -> None:
        model_path = _resolve_model_path()
        self.hub_model = tf.saved_model.load(str(model_path))

    def stylize(self, content_image: tf.Tensor, style_image: tf.Tensor) -> PIL.Image:
        """Stylizes a content image using a feed-forward arbitrary style transfer
        network from Ghiasi et al. (2017), https://arxiv.org/abs/1705.06830.

        Inputs:
        - content_image : tf.Tensor
        - style_image : tf.Tensor

        Use the stylize.utils.load_img function to load in Tensors which have been modified to suit the models requirements."""
        content_image = tf.constant(content_image)
        style_image = tf.constant(style_image)
        stylized_image = self.hub_model(
            tf.constant(content_image), tf.constant(style_image)
        )[0]
        return utils.tensor_to_image(stylized_image)
