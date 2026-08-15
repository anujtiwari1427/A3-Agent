"""
Health Check Router.
"""

from fastapi import APIRouter
from ..core.config import settings

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "mode": settings.MODE,
        "platform": "A3 Advanced Analytics Platform",
        "version": "2.1.0",
    }
