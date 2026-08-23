"""Dataset HTTP endpoints. Business logic lives in services/repositories."""

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.security import sanitize_filename, validate_file_upload
from ..core.storage import StorageClient
from ..models.domain import User
from ..repositories.dataset_repository import DatasetRepository
from ..schemas.dataset import DatasetDataResponse, DatasetRenameRequest, DatasetResponse
from ..services.dataset_service import (
    SAMPLE_BUILDERS,
    create_dataset_from_bytes,
    duplicate_dataset,
    parse_bytes_to_rows,
)

router = APIRouter(prefix="/api/v1/datasets", tags=["datasets"])
storage_client = StorageClient(mode=settings.MODE)


def _repo(db: DBSession) -> DatasetRepository:
    return DatasetRepository(db)


def _require_org(current_user: User) -> str:
    if not current_user.org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")
    return current_user.org_id


@router.post("/upload", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    content = await file.read()
    validate_file_upload(file, len(content))
    return await create_dataset_from_bytes(
        content=content,
        filename=file.filename or "dataset.csv",
        org_id=org_id,
        user_id=current_user.id,
        db=db,
    )


@router.get("", response_model=List[DatasetResponse])
def list_datasets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    return _repo(db).list_for_org(org_id, offset=(page - 1) * page_size, limit=page_size)


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = _repo(db).get_for_org(dataset_id, _require_org(current_user))
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
    dataset = _repo(db).get_for_org(dataset_id, _require_org(current_user))
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    dataset.name = sanitize_filename(body.name)
    if body.description is not None:
        dataset.description = body.description
    return _repo(db).save(dataset)


@router.post("/{dataset_id}/duplicate", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_dataset_endpoint(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    new_dataset = await duplicate_dataset(dataset_id, current_user.id, org_id, db)
    if not new_dataset:
        raise HTTPException(status_code=404, detail="Original dataset not found")
    return new_dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = _repo(db).get_for_org(dataset_id, _require_org(current_user))
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        await storage_client.delete(dataset.storage_path)
        if dataset.raw_storage_path and dataset.raw_storage_path != dataset.storage_path:
            await storage_client.delete(dataset.raw_storage_path)
    except FileNotFoundError:
        pass
    _repo(db).delete(dataset)


@router.get("/{dataset_id}/download")
async def download_dataset(
    dataset_id: str,
    raw: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = _repo(db).get_for_org(dataset_id, _require_org(current_user))
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    target_path = dataset.raw_storage_path if raw and dataset.raw_storage_path else dataset.storage_path
    try:
        content = await storage_client.download(target_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset file not found")
    filename = f"raw_{dataset.name}" if raw else dataset.name
    media_type = {
        "csv": "text/csv",
        "tsv": "text/tab-separated-values",
        "json": "application/json",
    }.get(dataset.file_type, "application/octet-stream")
    return Response(content=content, media_type=media_type, headers={
        "Content-Disposition": f'attachment; filename="{filename}"'
    })


@router.post("/sample/{sample_type}", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_sample_dataset(
    sample_type: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    sample_meta = SAMPLE_BUILDERS.get(sample_type.lower())
    if not sample_meta:
        raise HTTPException(status_code=400, detail=f"Unknown sample type '{sample_type}'")
    return await create_dataset_from_bytes(
        content=sample_meta["generate"]().encode("utf-8"),
        filename=sample_meta["filename"],
        org_id=org_id,
        user_id=current_user.id,
        db=db,
        description=sample_meta.get("description"),
    )


@router.get("/{dataset_id}/data", response_model=DatasetDataResponse)
async def get_dataset_data(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = _repo(db).get_for_org(dataset_id, _require_org(current_user))
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        content = await storage_client.download(dataset.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset file not found")
    headers, rows = parse_bytes_to_rows(content)
    total_rows = len(rows)
    total_pages = max(1, (total_rows + page_size - 1) // page_size)
    start = (page - 1) * page_size
    return DatasetDataResponse(
        columns=headers,
        rows=rows[start:start + page_size],
        total_rows=total_rows,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
