"""
Auth API router — register, login, and current-user endpoints.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session as DBSession

from .core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from .core.config import settings
from .core.database import get_db
from .models.domain import Org, User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str       # doubles as "username" in local mode
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    org_id: Optional[str]
    mode: str

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_dict(user: User) -> dict:
    """Serialize a User ORM object to a plain dict for API responses."""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "org_id": user.org_id,
        "mode": settings.MODE,
    }

# ---------------------------------------------------------------------------
# POST /register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    """Create a new user account and return a JWT token."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    # For cloud mode, create a personal org automatically
    org_id = None
    if settings.MODE == "cloud":
        org = Org(
            id=str(uuid.uuid4()),
            name=f"{body.full_name or body.email}'s Org",
            slug=str(uuid.uuid4())[:8],
            plan="free",
        )
        db.add(org)
        db.flush()
        org_id = org.id
    else:
        # Local mode — assign to the default local org
        local_org = db.query(Org).filter(Org.slug == "local").first()
        if local_org:
            org_id = local_org.id

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role="admin" if settings.MODE == "local" else "analyst",
        org_id=org_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=_user_dict(user))

# ---------------------------------------------------------------------------
# POST /login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    """Authenticate with email/username + password and return a JWT token."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=_user_dict(user))

# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return _user_dict(current_user)
