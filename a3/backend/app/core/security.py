"""
Security utilities — file upload validation, size limits, and sanitization.
"""

import os
import re
from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {".csv", ".json", ".txt", ".tsv"}


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and directory traversal patterns from filename."""
    base = os.path.basename(filename)
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    if not clean_name:
        clean_name = "dataset.csv"
    return clean_name


def validate_file_upload(file: UploadFile, content_length: int) -> None:
    """Check file extension and content length."""
    if content_length > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
