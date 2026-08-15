"""
Forecasting Router — time-series predictive modeling endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.forecasting import ForecastResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.forecasting_service import run_time_series_forecast

router = APIRouter(prefix="/api/v1/datasets", tags=["forecasting"])
storage_client = StorageClient(mode=settings.MODE)


@router.get("/{dataset_id}/forecast", response_model=ForecastResponse)
async def get_dataset_forecast(
    dataset_id: str,
    metric: Optional[str] = None,
    dimension: Optional[str] = None,
    horizon: int = Query(30, ge=1, le=365),
    model_type: str = Query("linear"),
    confidence: float = Query(0.95),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    return run_time_series_forecast(
        headers=headers,
        rows=rows,
        metric=metric,
        dimension=dimension,
        horizon=horizon,
        model_type=model_type,
        confidence=confidence,
    )
