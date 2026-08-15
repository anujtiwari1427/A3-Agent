"""
Cleaning Router — preview diff and non-destructive data cleaning.
"""

import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.dataset import DatasetResponse
from ..schemas.cleaning import CleanRequest, CleanPreviewResponse
from ..services.dataset_service import parse_bytes_to_rows, create_dataset_from_bytes
from ..services.cleaning_service import apply_cleaning_pipeline, rows_to_csv_bytes

router = APIRouter(prefix="/api/v1/datasets", tags=["cleaning"])
storage_client = StorageClient(mode=settings.MODE)


@router.post("/{dataset_id}/clean/preview", response_model=CleanPreviewResponse)
async def preview_clean_dataset(
    dataset_id: str,
    req: Optional[CleanRequest] = None,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    request_params = req or CleanRequest()
    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    _, _, preview, _ = apply_cleaning_pipeline(headers, rows, request_params)
    return preview


@router.post("/{dataset_id}/clean", response_model=DatasetResponse)
async def clean_dataset(
    dataset_id: str,
    req: Optional[CleanRequest] = None,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    request_params = req or CleanRequest()
    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    clean_headers, clean_rows, _, logs = apply_cleaning_pipeline(headers, rows, request_params)
    cleaned_bytes = rows_to_csv_bytes(clean_headers, clean_rows)

    if request_params.create_new_version:
        # Create separate child dataset
        cleaned_dataset = await create_dataset_from_bytes(
            content=cleaned_bytes,
            filename=f"Cleaned_{dataset.name}",
            org_id=current_user.org_id,
            user_id=current_user.id,
            db=db,
            description=f"Cleaned derivative of {dataset.name}",
            is_cleaned=True,
            parent_id=dataset.id,
        )
        cleaned_dataset.cleaning_log = json.dumps([l.model_dump() for l in logs])
        db.commit()
        db.refresh(cleaned_dataset)
        return cleaned_dataset

    # Non-destructive update: ensure raw_storage_path is preserved
    if not dataset.raw_storage_path:
        dataset.raw_storage_path = dataset.storage_path

    # Save cleaned derivative to a new storage path
    cleaned_filename = f"cleaned_{uuid.uuid4()}_{dataset.name}"
    new_storage_path = await storage_client.upload(cleaned_bytes, cleaned_filename)

    dataset.storage_path = new_storage_path
    dataset.row_count = len(clean_rows)
    dataset.col_count = len(clean_headers)
    dataset.size_bytes = len(cleaned_bytes)
    dataset.health_score = 100
    dataset.is_cleaned = True
    dataset.cleaning_log = json.dumps([l.model_dump() for l in logs])

    db.commit()
    db.refresh(dataset)
    return dataset
