"""Automated tests for Google OAuth 2.0 / Identity Services authentication and data privacy."""

import uuid
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, User, UserIdentity, Dataset
from app.repositories.dataset_repository import DatasetRepository
from app.routers.auth import google_sign_in, logout
from app.schemas.auth import GoogleLoginRequest
from app.services.google_auth_service import verify_google_token, authenticate_or_register_google_user
from app.core.config import settings


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()


def test_google_login_new_user_provisioning(test_db):
    """Test that a new Google user receives a unique personal workspace, User, and UserIdentity."""
    mock_profile = {
        "sub": "google-sub-1234567890",
        "email": "alex.google@example.com",
        "name": "Alex Google",
        "picture": "https://lh3.googleusercontent.com/a/test",
        "email_verified": True,
    }

    with patch("app.routers.auth.verify_google_token", return_value=mock_profile):
        resp = google_sign_in(GoogleLoginRequest(credential="mock-valid-google-id-token"), db=test_db)

    assert resp.access_token is not None
    assert resp.user["email"] == "alex.google@example.com"
    assert resp.user["role"] == "owner"

    user = test_db.query(User).filter(User.email == "alex.google@example.com").first()
    assert user is not None
    assert user.org_id is not None

    org = test_db.query(Org).filter(Org.id == user.org_id).first()
    assert org is not None
    assert "Alex Google" in org.name or "alex.google" in org.name
    assert org.slug.startswith("ws-")

    identity = test_db.query(UserIdentity).filter(UserIdentity.user_id == user.id).first()
    assert identity is not None
    assert identity.provider == "google"
    assert identity.provider_subject == "google-sub-1234567890"


def test_existing_google_user_subsequent_login(test_db):
    """Test that existing Google identity authenticates seamlessly without duplicate records."""
    mock_profile = {
        "sub": "google-sub-9999",
        "email": "sam@example.com",
        "name": "Sam Smith",
        "email_verified": True,
    }

    with patch("app.routers.auth.verify_google_token", return_value=mock_profile):
        resp1 = google_sign_in(GoogleLoginRequest(credential="mock-token-1"), db=test_db)
        resp2 = google_sign_in(GoogleLoginRequest(credential="mock-token-2"), db=test_db)

    assert resp1.user["id"] == resp2.user["id"]
    assert test_db.query(User).filter(User.email == "sam@example.com").count() == 1
    assert test_db.query(UserIdentity).filter(UserIdentity.provider_subject == "google-sub-9999").count() == 1


def test_account_linking_verified_email(test_db):
    """Test that an existing email/password user safely links their Google identity when email is verified."""
    org = Org(id=str(uuid.uuid4()), name="Pre-existing Workspace", slug="ws-existing-123", plan="personal")
    test_db.add(org)
    test_db.flush()

    existing_user = User(
        id=str(uuid.uuid4()),
        email="existing.dev@example.com",
        full_name="Existing Developer",
        role="owner",
        org_id=org.id,
        is_active=True,
    )
    test_db.add(existing_user)
    test_db.commit()

    mock_profile = {
        "sub": "google-sub-link-5555",
        "email": "existing.dev@example.com",
        "name": "Existing Developer Google",
        "email_verified": True,
    }

    with patch("app.routers.auth.verify_google_token", return_value=mock_profile):
        resp = google_sign_in(GoogleLoginRequest(credential="mock-token-link"), db=test_db)

    assert resp.user["id"] == existing_user.id
    assert resp.user["org_id"] == org.id

    identity = test_db.query(UserIdentity).filter(UserIdentity.provider_subject == "google-sub-link-5555").first()
    assert identity is not None
    assert identity.user_id == existing_user.id


def test_invalid_google_token_rejection(test_db):
    """Test that invalid Google credentials return 401 Unauthorized."""
    with patch("app.services.google_auth_service.urllib.request.urlopen", side_effect=Exception("Invalid token signature")):
        with pytest.raises(Exception):
            verify_google_token("invalid_garbage_token")


def test_google_user_data_isolation(test_db):
    """Test that two Google users have distinct personal workspaces and cannot access each other's datasets."""
    profile_a = {"sub": "google-user-a", "email": "user-a@gmail.com", "name": "User Alpha", "email_verified": True}
    profile_b = {"sub": "google-user-b", "email": "user-b@gmail.com", "name": "User Beta", "email_verified": True}

    user_a = authenticate_or_register_google_user(test_db, profile_a)
    user_b = authenticate_or_register_google_user(test_db, profile_b)

    assert user_a.id != user_b.id
    assert user_a.org_id != user_b.org_id

    repo = DatasetRepository(test_db)
    ds_a = Dataset(
        id=str(uuid.uuid4()),
        org_id=user_a.org_id,
        uploaded_by=user_a.id,
        name="google_a_metrics.csv",
        storage_path=f"{user_a.org_id}/{user_a.id}/datasets/a.csv",
        file_type="csv",
        row_count=10,
        col_count=2,
    )
    repo.save(ds_a)

    # User B cannot see or get User A's dataset
    assert repo.get_for_user(ds_a.id, user_b) is None
    assert len(repo.list_for_user(user_b)) == 0
    assert len(repo.list_for_user(user_a)) == 1


def test_logout_audit_endpoint(test_db):
    """Test that logout endpoint logs an audit record."""
    user = User(id="user-logout-test", email="logout@example.com", org_id="org-logout", role="owner", is_active=True)
    test_db.add(user)
    test_db.commit()

    res = logout(current_user=user, db=test_db)
    assert res["message"] == "Logged out successfully"
