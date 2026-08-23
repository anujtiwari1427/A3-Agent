import pytest
from pydantic import ValidationError

from app.schemas.auth import LoginRequest, RegisterRequest


def test_register_normalizes_email():
    request = RegisterRequest(email=" User@Example.COM ", password="strong-password-123")
    assert request.email == "user@example.com"


def test_register_rejects_short_password():
    with pytest.raises(ValidationError):
        RegisterRequest(email="user@example.com", password="short")


def test_login_requires_valid_email():
    with pytest.raises(ValidationError):
        LoginRequest(email="not-an-email", password="password")
