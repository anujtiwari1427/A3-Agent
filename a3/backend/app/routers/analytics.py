"""
Analytics Router — correlation matrices, regression equations, group-by, and hypothesis testing.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.analytics import (
    CorrelationResponse,
    RegressionResponse,
    GroupByResponse,
    HypothesisTestRequest,
    HypothesisTestResponse,
)
from ..services.dataset_service import parse_bytes_to_rows
from ..services.analytics_service import (
    calculate_correlations,
    calculate_regression,
    calculate_group_by,
    calculate_hypothesis_test,
)

router = APIRouter(prefix="/api/v1/datasets", tags=["analytics"])
storage_client = StorageClient(mode=settings.MODE)


@router.get("/{dataset_id}/correlations", response_model=CorrelationResponse)
async def get_dataset_correlations(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)
    return calculate_correlations(headers, rows)


@router.get("/{dataset_id}/regression", response_model=RegressionResponse)
async def get_dataset_regression(
    dataset_id: str,
    feature: str = Query(...),
    target: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)
    return calculate_regression(headers, rows, feature, target)


@router.get("/{dataset_id}/groupby", response_model=GroupByResponse)
async def get_dataset_groupby(
    dataset_id: str,
    group_col: str = Query(...),
    metric_cols: List[str] = Query(...),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)
    return calculate_group_by(headers, rows, group_col, metric_cols)


@router.post("/{dataset_id}/hypothesis", response_model=HypothesisTestResponse)
async def get_dataset_hypothesis_test(
    dataset_id: str,
    req: HypothesisTestRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)
    return calculate_hypothesis_test(
        headers=headers,
        rows=rows,
        group_col=req.group_column,
        seg_a=req.segment_a,
        seg_b=req.segment_b,
        metric_col=req.metric_column,
        conf_level=req.confidence_level,
    )
