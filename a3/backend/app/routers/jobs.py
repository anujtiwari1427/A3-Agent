"""Background Job Management HTTP Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.database import get_db
from ..models.domain import User
from ..repositories.job_repository import JobRepository
from ..schemas.jobs import JobResponse, JobListResponse
from ..services.job_service import serialize_job

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


def _require_org(user: User) -> str:
    if not user.org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")
    return user.org_id


@router.get("", response_model=List[JobResponse])
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    repo = JobRepository(db)
    jobs = repo.list_for_org(org_id, offset=(page - 1) * page_size, limit=page_size)
    return [serialize_job(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    repo = JobRepository(db)
    job = repo.get_for_org(job_id, org_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_job(job)


@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    repo = JobRepository(db)
    job = repo.get_for_org(job_id, org_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("COMPLETED", "FAILED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel job with status '{job.status}'")
    updated = repo.update_status(job_id, status="CANCELLED")
    return serialize_job(updated or job)
