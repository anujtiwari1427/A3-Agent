"""Profiling Router — statistical profiling with privacy enforcement."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import User
from ..repositories.dataset_repository import DatasetRepository
from ..schemas.analytics import AnalyticsResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.profiling_service import generate_full_analytics

router = APIRouter(prefix="/api/v1/datasets", tags=["profiling"])
storage_client = StorageClient(mode=settings.MODE)


@router.get("/{dataset_id}/analytics", response_model=AnalyticsResponse)
@router.get("/{dataset_id}/profile", response_model=AnalyticsResponse)
async def get_dataset_profile(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = DatasetRepository(db).get_for_user(dataset_id, current_user)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)
    return generate_full_analytics(headers, rows)
