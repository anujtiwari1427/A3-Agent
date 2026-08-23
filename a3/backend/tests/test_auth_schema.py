import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, User
from app.routers.auth import register, verify_license, login
from app.schemas.auth import LoginRequest, RegisterRequest, VerifyLicenseRequest


def test_register_normalizes_email():
    request = RegisterRequest(email=" User@Example.COM ", password="strong-password-123")
    assert request.email == "user@example.com"


def test_register_rejects_short_password():
    with pytest.raises(ValidationError):
        RegisterRequest(email="user@example.com", password="short")


def test_login_requires_valid_email():
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="password")


def test_verify_license_schema():
    req = VerifyLicenseRequest(license_key="7710916655")
    assert req.license_key == "7710916655"


def test_registration_and_login_flow():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Register user
    res = register(
        RegisterRequest(email="tester@example.com", password="secure_password_123", full_name="Tester"),
        db=db,
    )
    assert res.access_token is not None
    assert res.token_type == "bearer"
    assert res.user["email"] == "tester@example.com"
    assert res.user["role"] == "owner"
    assert res.user["org_id"] is not None

    # Login user
    login_res = login(
        LoginRequest(email="tester@example.com", password="secure_password_123"),
        db=db,
    )
    assert login_res.access_token is not None
    assert login_res.user["id"] == res.user["id"]

    db.close()
