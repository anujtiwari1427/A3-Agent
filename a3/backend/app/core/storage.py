"""Storage abstraction for local development and cloud adapters."""

import os
from pathlib import Path

from .config import settings
from .security import resolve_storage_path


class StorageClient:
    def __init__(self, mode: str):
        self.mode = mode
        if mode == "local":
            Path(settings.STORAGE_PATH).mkdir(parents=True, exist_ok=True)

    def _local_path(self, path: str) -> Path:
        return resolve_storage_path(settings.STORAGE_PATH, path)

    async def upload(self, file_bytes: bytes, path: str) -> str:
        if self.mode != "local":
            raise NotImplementedError("Cloud storage adapter is not configured")
        target = self._local_path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(file_bytes)
        return str(target)

    async def download(self, path: str) -> bytes:
        if self.mode != "local":
            raise NotImplementedError("Cloud storage adapter is not configured")
        target = self._local_path(path)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError("Stored dataset was not found")
        return target.read_bytes()

    async def delete(self, path: str) -> None:
        if self.mode != "local":
            raise NotImplementedError("Cloud storage adapter is not configured")
        target = self._local_path(path)
        if target.exists():
            target.unlink()
