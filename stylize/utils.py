import os

import tensorflow as tf
import numpy as np
import PIL.Image
from io import BytesIO

from PIL import UnidentifiedImageError


# Long-edge size that inputs are resized to before inference. The Magenta
# arbitrary-stylization network is fully convolutional, so this is configurable;
# 512 px is the historical default and gives the best quality-per-CPU-second
# ratio on small ARM instances. Going much above ~1024 px gives diminishing
# visual returns because the model was trained at 256x256.
MAX_DIMENSION = int(os.environ.get("PICASSO_INFERENCE_MAX_DIMENSION", 1536  ))


def tensor_to_image(tensor: tf.Tensor) -> PIL.Image:
    """Converts a tensor to a PIL.Image object after applying the following transforms:
    - Scales value from 0 to 1 to 0-255
    - casts the datatypes to np.uint8"""
    tensor = tensor * 255
    tensor = np.array(tensor, dtype=np.uint8)
    if np.ndim(tensor) > 3:
        assert tensor.shape[0] == 1
        tensor = tensor[0]
    return PIL.Image.fromarray(tensor)


def _validate_image_size(img: PIL.Image.Image, max_pixels: int | None = None) -> None:
    if max_pixels is not None and img.width * img.height > max_pixels:
        raise ValueError("Image dimensions are too large")


def load_img(path_to_img: str, max_pixels: int | None = None) -> tf.Tensor:
    """Takes path to file as input, returns a Tensor
    Performs the following operations:
    - Scales the image so the longest dimension of the image shape is 512
    - Expands dimensions in front"""
    with PIL.Image.open(path_to_img) as pil_image:
        _validate_image_size(pil_image, max_pixels=max_pixels)

    img = tf.io.read_file(path_to_img)
    img = tf.image.decode_image(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    # Takes the shape of the image, which is a tensor and converts it to an array of 32-bit floats
    # Also removes the last element (The number of channels)
    shape = tf.cast(tf.shape(img)[:-1], tf.float32)
    long_dim = max(shape)
    scale = MAX_DIMENSION / long_dim

    new_shape = tf.cast(shape * scale, tf.int32)

    img = tf.image.resize(img, new_shape)
    img = img[tf.newaxis, :]
    return img

def load_img_from_bytesio(img: BytesIO, max_pixels: int | None = None) -> tf.Tensor:
    """Takes a BytesIO object as input, returns a Tensor
    Performs the following operations:
    - Scales the image so the longest dimension of the image shape is 512
    - Expands dimensions in front"""
    raw_image = img.read()
    try:
        with PIL.Image.open(BytesIO(raw_image)) as pil_image:
            _validate_image_size(pil_image, max_pixels=max_pixels)
    except UnidentifiedImageError as exc:
        raise ValueError("Invalid image file") from exc

    img = tf.image.decode_image(raw_image, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    # Takes the shape of the image, which is a tensor and converts it to an array of 32-bit floats
    # Also removes the last element (The number of channels)
    shape = tf.cast(tf.shape(img)[:-1], tf.float32)
    long_dim = max(shape)
    scale = MAX_DIMENSION / long_dim

    new_shape = tf.cast(shape * scale, tf.int32)

    img = tf.image.resize(img, new_shape)
    img = img[tf.newaxis, :]
    return img

def img_to_bytesio(img: PIL.Image, format="JPEG") -> BytesIO:
    """Converts a PIL Image object to and returns a BytesIO buffer
    Inputs:
    - img : PIL.Image object, the image to be saved.
    - format : A string of the file format, JPEG by default.
    Other options are PNG, BMP, TGA, TIFF."""
    buf = BytesIO()
    img.save(buf, format=format)
    buf.seek(0)
    return buf
