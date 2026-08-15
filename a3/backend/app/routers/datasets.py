"""
Datasets Router — CRUD, upload validation, sample injection, pagination, and download.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.security import validate_file_upload, sanitize_filename
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.dataset import DatasetResponse, DatasetDataResponse, DatasetRenameRequest
from ..services.dataset_service import (
    create_dataset_from_bytes,
    parse_bytes_to_rows,
    duplicate_dataset,
    SAMPLE_BUILDERS
)

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])
storage_client = StorageClient(mode=settings.MODE)


@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    content = await file.read()
    validate_file_upload(file, len(content))

    dataset = await create_dataset_from_bytes(
        content=content,
        filename=file.filename or "dataset.csv",
        org_id=current_user.org_id,
        user_id=current_user.id,
        db=db,
    )
    return dataset


@router.get("", response_model=List[DatasetResponse])
def list_datasets(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if not current_user.org_id:
        return []
    return db.query(Dataset).filter(Dataset.org_id == current_user.org_id).order_by(Dataset.created_at.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.patch("/{dataset_id}", response_model=DatasetResponse)
def rename_dataset(
    dataset_id: str,
    body: DatasetRenameRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset.name = sanitize_filename(body.name)
    if body.description is not None:
        dataset.description = body.description
    db.commit()
    db.refresh(dataset)
    return dataset


@router.post("/{dataset_id}/duplicate", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_dataset_endpoint(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    new_dataset = await duplicate_dataset(dataset_id, current_user.id, current_user.org_id, db)
    if not new_dataset:
        raise HTTPException(status_code=404, detail="Original dataset not found")
    return new_dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this dataset")

    try:
        await storage_client.delete(dataset.storage_path)
        if dataset.raw_storage_path and dataset.raw_storage_path != dataset.storage_path:
            await storage_client.delete(dataset.raw_storage_path)
    except Exception:
        pass

    db.delete(dataset)
    db.commit()
    return


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: str,
    raw: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_path = dataset.raw_storage_path if (raw and dataset.raw_storage_path) else dataset.storage_path
    content = await storage_client.download(target_path)

    filename = f"raw_{dataset.name}" if raw else dataset.name
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/sample/{sample_type}", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_sample_dataset(
    sample_type: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    sample_meta = SAMPLE_BUILDERS.get(sample_type.lower())
    if not sample_meta:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sample type '{sample_type}'. Available: {list(SAMPLE_BUILDERS.keys())}",
        )

    content = sample_meta["generate"]().encode("utf-8")
    dataset = await create_dataset_from_bytes(
        content=content,
        filename=sample_meta["filename"],
        org_id=current_user.org_id,
        user_id=current_user.id,
        db=db,
        description=sample_meta.get("description"),
    )
    return dataset


@router.get("/{dataset_id}/data", response_model=DatasetDataResponse)
async def get_dataset_data(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    total_rows = len(rows)
    total_pages = max(1, (total_rows + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    sliced_rows = rows[start_idx : start_idx + page_size]

    return DatasetDataResponse(
        columns=headers,
        rows=sliced_rows,
        total_rows=total_rows,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
