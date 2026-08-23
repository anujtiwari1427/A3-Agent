"""Tests verifying strict multi-tenant data isolation between organizations."""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, User, Dataset, Report, Job
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.job_repository import JobRepository


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # Create two isolated organizations
    org_a = Org(id="org-a", name="Acme Corp", slug="acme", plan="pro")
    org_b = Org(id="org-b", name="Beta Inc", slug="beta", plan="free")

    user_a = User(id="user-a", email="alice@acme.com", org_id="org-a", role="admin", is_active=True)
    user_b = User(id="user-b", email="bob@beta.com", org_id="org-b", role="admin", is_active=True)

    db.add_all([org_a, org_b, user_a, user_b])
    db.commit()

    yield db
    db.close()


def test_dataset_multi_tenant_isolation(test_db):
    dataset_repo = DatasetRepository(test_db)

    # Org A creates a dataset
    ds_a = Dataset(
        id=str(uuid.uuid4()),
        org_id="org-a",
        uploaded_by="user-a",
        name="acme_q1_sales.csv",
        storage_path="/storage/acme_q1.csv",
        file_type="csv",
        row_count=100,
        col_count=5,
    )
    dataset_repo.save(ds_a)

    # User B from Org B attempts to access Org A's dataset
    found_by_b = dataset_repo.get_for_org(ds_a.id, org_id="org-b")
    assert found_by_b is None, "Org B should not be able to fetch Org A's dataset"

    # User A from Org A can access it
    found_by_a = dataset_repo.get_for_org(ds_a.id, org_id="org-a")
    assert found_by_a is not None
    assert found_by_a.name == "acme_q1_sales.csv"

    # Org B listing datasets should return empty list
    org_b_list = dataset_repo.list_for_org(org_id="org-b")
    assert len(org_b_list) == 0


def test_report_multi_tenant_isolation(test_db):
    report_repo = ReportRepository(test_db)

    rep_a = Report(
        id=str(uuid.uuid4()),
        org_id="org-a",
        dataset_id="ds-a",
        created_by="user-a",
        title="Q1 Confidential Audit",
        content_markdown="# Q1 Revenue Summary",
    )
    report_repo.save(rep_a)

    # Verify Org B cannot view Org A report
    assert report_repo.get_for_org(rep_a.id, org_id="org-b") is None
    assert len(report_repo.list_for_org(org_id="org-b")) == 0
    assert len(report_repo.list_for_org(org_id="org-a")) == 1


def test_job_multi_tenant_isolation(test_db):
    job_repo = JobRepository(test_db)

    job_a = job_repo.create(
        org_id="org-a",
        user_id="user-a",
        job_type="forecast",
        payload={"metric": "Sales", "horizon": 30},
    )

    # Verify Org B cannot access Org A job
    assert job_repo.get_for_org(job_a.id, org_id="org-b") is None
    assert job_repo.get_for_org(job_a.id, org_id="org-a") is not None
    assert len(job_repo.list_for_org(org_id="org-b")) == 0
    assert len(job_repo.list_for_org(org_id="org-a")) == 1
