"""Authentication utilities — password hashing, JWT tokens, RBAC, API keys, and current-user dependency."""

from datetime import datetime, timedelta, timezone
from typing import Optional, List
import hashlib
import secrets

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session as DBSession

from .config import settings
from .database import get_db
from ..models.domain import User, ApiKey, Org

# ---------------------------------------------------------------------------
# Password hashing (bcrypt)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Return a bcrypt hash of *password*."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ---------------------------------------------------------------------------
# JWT token helpers
# ---------------------------------------------------------------------------
ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT containing *data* with an expiry claim."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Role-Based Access Control (RBAC)
# ---------------------------------------------------------------------------
ROLE_HIERARCHY = {
    "owner": 4,
    "admin": 3,
    "analyst": 2,
    "viewer": 1,
}


def check_role_permission(user_role: str, min_role: str) -> bool:
    user_level = ROLE_HIERARCHY.get(user_role.lower(), 1)
    required_level = ROLE_HIERARCHY.get(min_role.lower(), 1)
    return user_level >= required_level


# ---------------------------------------------------------------------------
# FastAPI dependency — extract current user from Bearer token or API Key
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key_val: Optional[str] = Depends(api_key_header),
    db: DBSession = Depends(get_db),
) -> User:
    """Decode the JWT or validate the API Key, look up the user, and return it."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Try Bearer JWT
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
            user_id: Optional[str] = payload.get("sub")
            if user_id is None:
                raise credentials_exception
            user = db.query(User).filter(User.id == user_id).first()
            if user is None or not user.is_active:
                raise credentials_exception
            return user
        except JWTError:
            pass

    # 2. Try API Key Header
    if api_key_val:
        key_hash = hashlib.sha256(api_key_val.encode("utf-8")).hexdigest()
        key_record = (
            db.query(ApiKey)
            .filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
            .first()
        )
        if key_record:
            if key_record.expires_at and key_record.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key has expired")
            # Update last used timestamp
            key_record.last_used_at = datetime.now(timezone.utc)
            db.commit()
            user = db.query(User).filter(User.id == key_record.user_id).first()
            if user and user.is_active:
                return user

    raise credentials_exception


def require_role(min_role: str):
    """Dependency factory requiring minimum RBAC role."""
    def role_verifier(current_user: User = Depends(get_current_user)) -> User:
        user_role = current_user.role or "viewer"
        if not check_role_permission(user_role, min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires '{min_role}' privileges (current role: '{user_role}')",
            )
        return current_user
    return role_verifier
