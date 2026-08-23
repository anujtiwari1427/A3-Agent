"""Security utilities for uploads, filenames, and path containment."""

import os
import re
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".csv", ".json", ".txt", ".tsv"}


def sanitize_filename(filename: str) -> str:
    """Return a safe basename suitable for display/storage keys."""
    base = os.path.basename(filename or "")
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    clean_name = clean_name.lstrip(".")
    return clean_name or "dataset.csv"


def validate_file_upload(file: UploadFile, content_length: int) -> None:
    """Validate upload size and extension before persistence."""
    if content_length > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)}MB",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )


def resolve_storage_path(root: str, path: str) -> Path:
    """Resolve a storage path and reject traversal outside the storage root."""
    root_path = Path(root).resolve()
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = root_path / candidate
    resolved = candidate.resolve()
    try:
        resolved.relative_to(root_path)
    except ValueError as exc:
        raise ValueError("Storage path escapes configured storage root") from exc
    return resolved
