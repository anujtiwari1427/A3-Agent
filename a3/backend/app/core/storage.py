"""Storage abstraction providing pluggable local and cloud storage providers."""

from abc import ABC, abstractmethod
import os
from pathlib import Path
from typing import Optional

from .config import settings
from .security import resolve_storage_path


class StorageProvider(ABC):
    @abstractmethod
    async def upload(self, file_bytes: bytes, path: str) -> str:
        """Upload file bytes and return storage path / URI."""
        pass

    @abstractmethod
    async def download(self, path: str) -> bytes:
        """Download file bytes by path / URI."""
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete stored file by path / URI."""
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if file exists."""
        pass

    @abstractmethod
    async def get_url(self, path: str) -> str:
        """Return public or presigned download URL."""
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, root_path: Optional[str] = None):
        self.root = Path(root_path or settings.STORAGE_PATH).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, path: str) -> Path:
        return resolve_storage_path(str(self.root), path)

    async def upload(self, file_bytes: bytes, path: str) -> str:
        target = self._resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Atomic write to prevent partially-written corrupted files
        temp_target = target.with_suffix(f"{target.suffix}.tmp")
        temp_target.write_bytes(file_bytes)
        temp_target.replace(target)
        return str(target)

    async def download(self, path: str) -> bytes:
        target = self._resolve(path)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError(f"Stored dataset was not found: {path}")
        return target.read_bytes()

    async def delete(self, path: str) -> None:
        target = self._resolve(path)
        if target.exists() and target.is_file():
            target.unlink()

    async def exists(self, path: str) -> bool:
        try:
            target = self._resolve(path)
            return target.exists() and target.is_file()
        except ValueError:
            return False

    async def get_url(self, path: str) -> str:
        target = self._resolve(path)
        return f"file://{target}"


def get_storage_provider() -> StorageProvider:
    return LocalStorageProvider()


class StorageClient(LocalStorageProvider):
    """Backwards-compatible alias for existing service usage."""
    def __init__(self, mode: str = "local"):
        super().__init__()
