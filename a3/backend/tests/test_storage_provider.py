"""Tests verifying StorageProvider implementations and path containment."""

import asyncio
import tempfile
from pathlib import Path

from app.core.storage import LocalStorageProvider


def test_local_storage_provider_lifecycle():
    async def _run():
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(root_path=tmpdir)
            filename = "test_dataset.csv"
            content = b"col1,col2\n10,20\n30,40\n"

            # 1. Upload
            stored_path = await provider.upload(content, filename)
            assert Path(stored_path).exists()
            assert Path(stored_path).read_bytes() == content

            # 2. Exists
            assert await provider.exists(filename) is True

            # 3. Download
            downloaded = await provider.download(filename)
            assert downloaded == content

            # 4. URL
            url = await provider.get_url(filename)
            assert url.startswith("file://")

            # 5. Delete
            await provider.delete(filename)
            assert await provider.exists(filename) is False

    asyncio.run(_run())


def test_local_storage_traversal_rejection():
    async def _run():
        with tempfile.TemporaryDirectory() as tmpdir:
            provider = LocalStorageProvider(root_path=tmpdir)
            dangerous_path = "../../etc/passwd"

            try:
                await provider.upload(b"malicious", dangerous_path)
                assert False, "Expected ValueError on path escape"
            except ValueError:
                pass

    asyncio.run(_run())
