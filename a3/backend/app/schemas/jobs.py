"""Pydantic schemas for Background Jobs."""

from typing import Optional, Any, Dict, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class JobResponse(BaseModel):
    id: str
    org_id: str
    user_id: Optional[str] = None
    job_type: str
    status: str  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress_pct: int = 0
    payload: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    page_size: int
