"""Tests verifying background job processing and status updates."""

import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, Job
from app.repositories.job_repository import JobRepository
from app.services.job_service import execute_background_job, serialize_job


def test_job_execution_lifecycle():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    org = Org(id="org-test", name="Test Org", slug="test", plan="enterprise")
    db.add(org)
    db.commit()

    repo = JobRepository(db)

    job = repo.create(
        org_id="org-test",
        job_type="analytics_profiling",
        payload={"sample_size": 500},
    )
    assert job.status == "QUEUED"
    assert job.progress_pct == 0

    repo.update_status(job.id, status="RUNNING", progress_pct=50)
    running_job = repo.get_for_org(job.id, "org-test")
    assert running_job.status == "RUNNING"
    assert running_job.progress_pct == 50

    repo.update_status(job.id, status="COMPLETED", progress_pct=100, result={"kpi": 100})
    completed_job = repo.get_for_org(job.id, "org-test")
    assert completed_job.status == "COMPLETED"
    assert completed_job.progress_pct == 100

    serialized = serialize_job(completed_job)
    assert serialized.id == job.id
    assert serialized.result == {"kpi": 100}
    db.close()
