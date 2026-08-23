"""Authentication and Identity endpoints with personal workspace isolation."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import create_access_token, get_current_user, hash_password, verify_password
from ..core.config import settings
from ..core.database import get_db
from ..models.domain import Org, User
from ..schemas.auth import (
    RegisterRequest,
    LoginRequest,
    VerifyLicenseRequest,
    VerifyLicenseResponse,
    TokenResponse,
    UserResponse,
)
from ..services.audit_service import record_audit

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "mode": settings.MODE,
    }


@router.post("/verify-license", response_model=VerifyLicenseResponse)
def verify_license(body: VerifyLicenseRequest):
    """Verify application activation key."""
    expected_license = (settings.LOCAL_LICENSE_KEY or "").strip()
    if not expected_license:
        return VerifyLicenseResponse(valid=True, message="Security license active")

    if body.license_key.strip() != expected_license:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Security License Key. Activation failed.",
        )

    return VerifyLicenseResponse(valid=True, message="Security License activated successfully")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    """Register a new user with an isolated personal workspace."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists")

    if settings.REQUIRE_LICENSE_KEY:
        expected_license = (settings.LOCAL_LICENSE_KEY or "").strip()
        if expected_license and (not body.license_key or body.license_key.strip() != expected_license):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Valid security license key required for registration",
            )

    # Create a unique personal workspace/organization for EVERY user
    workspace_suffix = uuid.uuid4().hex[:8]
    workspace_slug = f"ws-{workspace_suffix}"
    workspace_name = f"{body.full_name or body.email.split('@')[0]}'s Workspace"

    org = Org(
        id=str(uuid.uuid4()),
        name=workspace_name,
        slug=workspace_slug,
        plan="personal" if settings.MODE == "local" else "free",
    )
    db.add(org)
    db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="owner",
        org_id=org.id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(
        db,
        org_id=user.org_id,
        user_id=user.id,
        action="user.registered",
        resource_type="user",
        resource_id=user.id,
    )
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role, "org_id": user.org_id})
    return TokenResponse(access_token=token, user=_user_dict(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    """Authenticate with user credentials and issue a workspace-scoped session token."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.hashed_password or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    record_audit(
        db,
        org_id=user.org_id,
        user_id=user.id,
        action="user.login",
        resource_type="user",
        resource_id=user.id,
    )
    db.commit()
    token = create_access_token({"sub": user.id, "role": user.role, "org_id": user.org_id})
    return TokenResponse(access_token=token, user=_user_dict(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return authenticated user profile and active workspace."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        org_id=current_user.org_id,
        mode=settings.MODE,
    )
