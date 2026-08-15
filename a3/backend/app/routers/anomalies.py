"""
Anomalies Router — statistical outlier detection endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.anomaly import AnomaliesResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.anomaly_service import detect_anomalies

router = APIRouter(prefix="/api/v1/datasets", tags=["anomalies"])
storage_client = StorageClient(mode=settings.MODE)


@router.get("/{dataset_id}/anomalies", response_model=AnomaliesResponse)
async def get_dataset_anomalies(
    dataset_id: str,
    threshold: float = Query(2.0, ge=1.0, le=5.0),
    method: str = Query("z_score"),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    return detect_anomalies(headers, rows, method=method, threshold=threshold)
