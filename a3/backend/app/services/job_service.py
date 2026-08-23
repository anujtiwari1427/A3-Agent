"""Background job execution and orchestration service."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional, Callable, Awaitable
from sqlalchemy.orm import Session as DBSession

from ..core.database import SessionLocal
from ..models.domain import Job
from ..repositories.job_repository import JobRepository
from ..schemas.jobs import JobResponse

logger = logging.getLogger(__name__)


def serialize_job(job: Job) -> JobResponse:
    payload = json.loads(job.payload_json) if job.payload_json else None
    result = json.loads(job.result_json) if job.result_json else None
    return JobResponse(
        id=job.id,
        org_id=job.org_id,
        user_id=job.user_id,
        job_type=job.job_type,
        status=job.status,
        progress_pct=job.progress_pct or 0,
        payload=payload,
        result=result,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


async def execute_background_job(
    job_id: str,
    handler: Callable[[Dict[str, Any], DBSession], Awaitable[Dict[str, Any]]],
    payload: Dict[str, Any],
) -> None:
    """Run job execution asynchronously with status tracking and error isolation."""
    db = SessionLocal()
    repo = JobRepository(db)
    try:
        repo.update_status(job_id, status="RUNNING", progress_pct=10)
        result = await handler(payload, db)
        repo.update_status(job_id, status="COMPLETED", progress_pct=100, result=result)
    except Exception as exc:
        logger.exception("Background job %s failed: %s", job_id, exc)
        repo.update_status(job_id, status="FAILED", progress_pct=100, error_message=str(exc))
    finally:
        db.close()
