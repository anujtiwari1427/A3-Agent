"""Liveness and readiness endpoints."""

from fastapi import APIRouter, Response, status

from ..core.config import settings
from ..core.database import check_database

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "mode": settings.MODE,
        "platform": "A3 Advanced Analytics Platform",
        "version": "2.3.0",
    }


@router.get("/ready")
async def readiness_check(response: Response):
    database_ok = check_database()
    if not database_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "ready" if database_ok else "not_ready",
        "database": "ok" if database_ok else "unavailable",
    }
