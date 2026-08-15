import os
from .config import settings

class StorageClient:
    def __init__(self, mode: str):
        self.mode = mode
        if mode == "local":
            os.makedirs(settings.STORAGE_PATH, exist_ok=True)

    async def upload(self, file_bytes: bytes, path: str) -> str:
        if self.mode == "local":
            # If path is already inside STORAGE_PATH, use it directly
            if os.path.isabs(path) or path.startswith(settings.STORAGE_PATH) or path.startswith("./data/uploads"):
                full_path = path
            else:
                full_path = os.path.join(settings.STORAGE_PATH, path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(file_bytes)
            return full_path
        else:
            # Stub for Supabase storage upload
            return path

    async def download(self, path: str) -> bytes:
        if self.mode == "local":
            if os.path.exists(path):
                full_path = path
            else:
                full_path = os.path.join(settings.STORAGE_PATH, path)
            with open(full_path, "rb") as f:
                return f.read()
        else:
            # Stub for Supabase storage download
            return b""

    async def delete(self, path: str):
        if self.mode == "local":
            if os.path.exists(path):
                full_path = path
            else:
                full_path = os.path.join(settings.STORAGE_PATH, path)
            if os.path.exists(full_path):
                os.remove(full_path)
        else:
            # Stub for Supabase storage delete
            pass
