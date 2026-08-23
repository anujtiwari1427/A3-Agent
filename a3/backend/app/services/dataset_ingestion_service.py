"""Dataset ingestion and lightweight tabular parsing helpers."""

import csv
import io
import json
from typing import Any


SUPPORTED_TYPES = {"csv", "json", "tsv"}


def detect_file_type(filename: str) -> str:
    """Return a normalized supported file type or ``unknown``."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"


def parse_tabular_bytes(content: bytes, file_type: str) -> tuple[list[str], list[dict[str, Any]]]:
    """Parse CSV/TSV/JSON bytes into headers and row dictionaries.

    This service deliberately contains no HTTP, database, or storage concerns,
    which makes it straightforward to unit test and reuse from background jobs.
    """
    if file_type not in SUPPORTED_TYPES:
        raise ValueError(f"Unsupported dataset type: {file_type}")

    if file_type == "json":
        data = json.loads(content.decode("utf-8-sig"))
        if not isinstance(data, list) or not all(isinstance(row, dict) for row in data):
            raise ValueError("JSON datasets must be an array of objects")
        headers = list(dict.fromkeys(key for row in data for key in row.keys()))
        return headers, [{header: row.get(header) for header in headers} for row in data]

    text = content.decode("utf-8-sig")
    delimiter = "\t" if file_type == "tsv" else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = [header.strip() for header in (reader.fieldnames or [])]
    if not headers:
        return [], []

    rows: list[dict[str, Any]] = []
    for raw_row in reader:
        row: dict[str, Any] = {}
        for header in headers:
            value = (raw_row.get(header) or "").strip()
            row[header] = _coerce_scalar(value)
        rows.append(row)
    return headers, rows


def _coerce_scalar(value: str) -> Any:
    if value == "":
        return ""
    try:
        return float(value) if any(char in value for char in ".eE") else int(value)
    except ValueError:
        return value


def analyze_dataset(content: bytes, filename: str) -> dict[str, int | str]:
    """Calculate basic dataset metadata without touching persistence layers."""
    file_type = detect_file_type(filename)
    headers, rows = parse_tabular_bytes(content, file_type)
    cells = len(rows) * len(headers)
    empty_cells = sum(1 for row in rows for value in row.values() if value == "")
    health_score = 100 if cells == 0 else max(10, min(100, int(100 - empty_cells / cells * 100)))
    return {
        "file_type": file_type,
        "row_count": len(rows),
        "col_count": len(headers),
        "size_bytes": len(content),
        "health_score": health_score,
    }
