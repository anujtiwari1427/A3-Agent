from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class ColumnSchema(BaseModel):
    name: str
    type: str  # "numeric" | "string" | "date" | "boolean"
    nullable: bool = True
    unique_count: int = 0
    null_count: int = 0
    sample_values: List[Any] = []


class DatasetResponse(BaseModel):
    id: str
    org_id: str
    uploaded_by: Optional[str] = None
    name: str
    description: Optional[str] = None
    storage_path: str
    file_type: str
    row_count: int
    col_count: int
    size_bytes: int
    health_score: int
    is_cleaned: bool = False
    parent_dataset_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DatasetDetailResponse(DatasetResponse):
    columns: List[ColumnSchema] = []
    cleaning_log: Optional[List[Dict[str, Any]]] = None


class DatasetDataResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int
    page_size: int
    total_pages: int


class DatasetRenameRequest(BaseModel):
    name: str
    description: Optional[str] = None


class SampleDatasetRequest(BaseModel):
    sample_type: str  # "ecommerce" | "saas" | "fintech"
