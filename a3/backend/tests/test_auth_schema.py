import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.domain import Org, User
from app.routers.auth import license_login
from app.schemas.auth import LoginRequest, RegisterRequest, LicenseLoginRequest


def test_register_normalizes_email():
    request = RegisterRequest(email=" User@Example.COM ", password="strong-password-123")
    assert request.email == "user@example.com"


def test_register_rejects_short_password():
    with pytest.raises(ValidationError):
        RegisterRequest(email="user@example.com", password="short")


def test_login_requires_valid_email():
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="password")


def test_license_login_schema_validation():
    req = LicenseLoginRequest(license_key="7710916655")
    assert req.license_key == "7710916655"


def test_license_login_flow():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Valid default license key 7710916655
    res = license_login(LicenseLoginRequest(license_key="7710916655"), db=db)
    assert res.access_token is not None
    assert res.token_type == "bearer"
    assert res.user["role"] == "admin"

    # Invalid license key
    with pytest.raises(Exception):
        license_login(LicenseLoginRequest(license_key="wrong_license_999"), db=db)

    db.close()
