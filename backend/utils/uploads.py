"""Shared upload validation and storage helpers."""

import base64
import os
import re
from pathlib import Path

from werkzeug.utils import secure_filename

from utils.runtime import utc_now_naive

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ("jpg", (b"\xff\xd8\xff",)),
    "image/jpg": ("jpg", (b"\xff\xd8\xff",)),
    "image/png": ("png", (b"\x89PNG\r\n\x1a\n",)),
    "image/webp": ("webp", (b"RIFF",)),
}


def upload_dir(app):
    directory = Path(app.config.get("UPLOAD_DIR") or Path(__file__).resolve().parent.parent / "uploads")
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _validate_image_bytes(content, content_type, max_size):
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed.")
    if len(content) > max_size:
        raise ValueError("File size exceeds the configured upload limit.")

    extension, prefixes = ALLOWED_IMAGE_TYPES[content_type]
    if content_type == "image/webp":
        if not (content.startswith(b"RIFF") and content[8:12] == b"WEBP"):
            raise ValueError("Invalid file content. File is not a valid WEBP image.")
    elif not any(content.startswith(prefix) for prefix in prefixes):
        raise ValueError("Invalid file content. File signature does not match the declared type.")
    return extension


def save_avatar_file(app, file_storage, user_id):
    content = file_storage.read()
    file_storage.seek(0)
    max_size = int(app.config.get("MAX_CONTENT_LENGTH") or 5 * 1024 * 1024)
    extension = _validate_image_bytes(content, file_storage.content_type, max_size)
    filename = secure_filename(f"avatar_{user_id}_{int(utc_now_naive().timestamp())}.{extension}")
    path = upload_dir(app) / filename
    path.write_bytes(content)
    return f"/uploads/{filename}"


def save_avatar_data_url(app, data_url, user_id):
    match = re.match(r"^data:(image/(?:jpeg|jpg|png|webp));base64,(.+)$", data_url or "", re.IGNORECASE)
    if not match:
        raise ValueError("Invalid avatar data.")
    content_type = match.group(1).lower()
    content = base64.b64decode(match.group(2), validate=True)
    max_size = int(app.config.get("MAX_CONTENT_LENGTH") or 5 * 1024 * 1024)
    extension = _validate_image_bytes(content, content_type, max_size)
    filename = secure_filename(f"avatar_{user_id}_{int(utc_now_naive().timestamp())}.{extension}")
    path = upload_dir(app) / filename
    path.write_bytes(content)
    return f"/uploads/{filename}"


def resolve_upload_filename(filename):
    safe_name = secure_filename(os.path.basename(filename or ""))
    if not safe_name:
        raise ValueError("Invalid filename.")
    return safe_name
