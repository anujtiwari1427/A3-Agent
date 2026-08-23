"""Comprehensive Privacy Regression and Multi-User IDOR Security Tests."""

import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, User, Dataset, Report, Job
from app.repositories.dataset_repository import DatasetRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.job_repository import JobRepository
from app.repositories.api_key_repository import ApiKeyRepository
from app.routers.auth import register, verify_license
from app.schemas.auth import RegisterRequest, VerifyLicenseRequest
from app.core.config import settings


@pytest.fixture
def isolated_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()


def test_users_cannot_access_each_others_datasets(isolated_db):
    """
    PERMANENT PRIVACY REGRESSION TEST.
    
    Verifies that two distinct users (User A and User B):
    1. Register with completely distinct, isolated personal workspaces.
    2. Cannot see or enumerate each other's datasets via listing.
    3. Cannot access each other's dataset records via direct ID lookup.
    """
    # 1. Register User A and User B
    resp_a = register(
        RegisterRequest(email="test-a@example.com", password="password123", full_name="User Alpha"),
        db=isolated_db,
    )
    resp_b = register(
        RegisterRequest(email="test-b@example.com", password="password123", full_name="User Beta"),
        db=isolated_db,
    )

    user_a = isolated_db.query(User).filter(User.id == resp_a.user["id"]).first()
    user_b = isolated_db.query(User).filter(User.id == resp_b.user["id"]).first()

    assert user_a.id != user_b.id
    assert user_a.org_id != user_b.org_id, "User A and User B must have distinct personal workspaces!"

    dataset_repo = DatasetRepository(isolated_db)

    # 2. Upload datasets for User A and User B
    ds_a = Dataset(
        id=str(uuid.uuid4()),
        org_id=user_a.org_id,
        uploaded_by=user_a.id,
        name="private_A.csv",
        storage_path=f"{user_a.org_id}/{user_a.id}/datasets/ds_a/private_A.csv",
        file_type="csv",
        row_count=50,
        col_count=4,
        visibility="private",
    )
    dataset_repo.save(ds_a)

    ds_b = Dataset(
        id=str(uuid.uuid4()),
        org_id=user_b.org_id,
        uploaded_by=user_b.id,
        name="private_B.csv",
        storage_path=f"{user_b.org_id}/{user_b.id}/datasets/ds_b/private_B.csv",
        file_type="csv",
        row_count=80,
        col_count=6,
        visibility="private",
    )
    dataset_repo.save(ds_b)

    # 3. Verify Listing Isolation
    list_a = dataset_repo.list_for_user(user_a)
    assert len(list_a) == 1
    assert list_a[0].id == ds_a.id
    assert list_a[0].name == "private_A.csv"

    list_b = dataset_repo.list_for_user(user_b)
    assert len(list_b) == 1
    assert list_b[0].id == ds_b.id
    assert list_b[0].name == "private_B.csv"

    # 4. Verify Direct Access IDOR Protection
    # User A tries to access User B's dataset
    assert dataset_repo.get_for_user(ds_b.id, user_a) is None, "User A must NOT be able to access User B's dataset!"

    # User B tries to access User A's dataset
    assert dataset_repo.get_for_user(ds_a.id, user_b) is None, "User B must NOT be able to access User A's dataset!"


def test_cross_user_report_and_job_isolation(isolated_db):
    """Test that Reports, Jobs, and API Keys are completely isolated between users."""
    resp_a = register(
        RegisterRequest(email="analyst-a@corp.com", password="password123"),
        db=isolated_db,
    )
    resp_b = register(
        RegisterRequest(email="analyst-b@corp.com", password="password123"),
        db=isolated_db,
    )

    user_a = isolated_db.query(User).filter(User.id == resp_a.user["id"]).first()
    user_b = isolated_db.query(User).filter(User.id == resp_b.user["id"]).first()

    report_repo = ReportRepository(isolated_db)
    rep_a = Report(
        id=str(uuid.uuid4()),
        org_id=user_a.org_id,
        dataset_id=str(uuid.uuid4()),
        created_by=user_a.id,
        title="User A Secret Report",
        content_markdown="# Secret Data",
    )
    report_repo.save(rep_a)

    # User B cannot access User A's report
    assert report_repo.get_for_user(rep_a.id, user_b) is None
    assert len(report_repo.list_for_user(user_b)) == 0
    assert len(report_repo.list_for_user(user_a)) == 1

    # Jobs isolation
    job_repo = JobRepository(isolated_db)
    job_a = job_repo.create(
        org_id=user_a.org_id,
        user_id=user_a.id,
        job_type="analytics_profile",
        payload={"dataset_id": "test"},
    )
    assert job_repo.get_for_user(job_a.id, user_b) is None
    assert job_repo.get_for_user(job_a.id, user_a) is not None

    # API Keys isolation
    api_key_repo = ApiKeyRepository(isolated_db)
    key_record, _ = api_key_repo.create(
        org_id=user_a.org_id,
        user_id=user_a.id,
        name="User A Production Key",
    )
    assert len(api_key_repo.list_for_user(user_b)) == 0
    assert len(api_key_repo.list_for_user(user_a)) == 1
    assert api_key_repo.revoke_for_user(key_record.id, user_b) is False


def test_license_key_activation_verification():
    """Verify application activation gate."""
    # When LOCAL_LICENSE_KEY is set or empty
    res = verify_license(VerifyLicenseRequest(license_key="7710916655"))
    assert res.valid is True
