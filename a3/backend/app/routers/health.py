"""Liveness and readiness endpoints distinguishing process health, database, and storage availability."""

from fastapi import APIRouter, Response, status

from ..core.config import settings
from ..core.database import check_database
from ..core.storage import get_storage_provider

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "mode": settings.MODE,
        "platform": "A3 Advanced Analytics Platform",
        "version": "2.4.0",
    }


@router.get("/ready")
async def readiness_check(response: Response):
    database_ok = check_database()
    storage_ok = False
    try:
        storage = get_storage_provider()
        storage_ok = True
    except Exception:
        storage_ok = False

    is_ready = database_ok and storage_ok
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "database": "ok" if database_ok else "unavailable",
        "storage": "ok" if storage_ok else "unavailable",
    }
