"""
Auth Router — registration, login, and current user profile.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import create_access_token, get_current_user, hash_password, verify_password
from ..core.config import settings
from ..core.database import get_db
from ..models.domain import Org, User
from ..schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

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


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: DBSession = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

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
        local_org = db.query(Org).filter(Org.slug == "local").first()
        if not local_org:
            local_org = Org(id=str(uuid.uuid4()), name="Local", slug="local", plan="local")
            db.add(local_org)
            db.flush()
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


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: DBSession = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=_user_dict(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        org_id=current_user.org_id,
        mode=settings.MODE,
    )
