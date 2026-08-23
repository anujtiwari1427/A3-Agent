"""Database access for Job entities."""

import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session

from ..models.domain import Job


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_org(self, job_id: str, org_id: str) -> Optional[Job]:
        return (
            self.db.query(Job)
            .filter(Job.id == job_id, Job.org_id == org_id)
            .first()
        )

    def create(
        self,
        org_id: str,
        job_type: str,
        user_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Job:
        job = Job(
            org_id=org_id,
            user_id=user_id,
            job_type=job_type,
            status="QUEUED",
            progress_pct=0,
            payload_json=json.dumps(payload) if payload else None,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def update_status(
        self,
        job_id: str,
        status: str,
        progress_pct: Optional[int] = None,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Job]:
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None
        job.status = status
        if progress_pct is not None:
            job.progress_pct = progress_pct
        if result is not None:
            job.result_json = json.dumps(result)
        if error_message is not None:
            job.error_message = error_message
        self.db.commit()
        self.db.refresh(job)
        return job

    def list_for_org(self, org_id: str, offset: int = 0, limit: int = 50) -> list[Job]:
        return (
            self.db.query(Job)
            .filter(Job.org_id == org_id)
            .order_by(Job.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
