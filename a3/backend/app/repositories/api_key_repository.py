"""Database access and privacy-enforced queries for ApiKey entities."""

import hashlib
import secrets
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.domain import ApiKey, User


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


class ApiKeyRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        org_id: str,
        user_id: str,
        name: str,
        role: str = "analyst",
    ) -> Tuple[ApiKey, str]:
        """Generate a random secure API key, store its hash, and return (record, raw_key)."""
        raw_token = f"a3_live_{secrets.token_urlsafe(32)}"
        key_prefix = raw_token[:12]
        key_hash = hash_api_key(raw_token)

        key_record = ApiKey(
            org_id=org_id,
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            role=role,
            is_active=True,
        )
        self.db.add(key_record)
        self.db.commit()
        self.db.refresh(key_record)
        return key_record, raw_token

    def get_by_hash(self, key_hash: str) -> Optional[ApiKey]:
        return (
            self.db.query(ApiKey)
            .filter(ApiKey.key_hash == key_hash, ApiKey.is_active == True)
            .first()
        )

    def list_for_user(self, current_user: User) -> List[ApiKey]:
        q = self.db.query(ApiKey).filter(ApiKey.org_id == current_user.org_id)
        if settings.MODE == "local":
            q = q.filter(ApiKey.user_id == current_user.id)
        return q.order_by(ApiKey.created_at.desc()).all()

    def revoke_for_user(self, key_id: str, current_user: User) -> bool:
        q = self.db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.org_id == current_user.org_id)
        if settings.MODE == "local":
            q = q.filter(ApiKey.user_id == current_user.id)
        key = q.first()
        if not key:
            return False
        key.is_active = False
        self.db.commit()
        return True

    def list_for_org(self, org_id: str) -> List[ApiKey]:
        return (
            self.db.query(ApiKey)
            .filter(ApiKey.org_id == org_id)
            .order_by(ApiKey.created_at.desc())
            .all()
        )

    def revoke(self, key_id: str, org_id: str) -> bool:
        key = (
            self.db.query(ApiKey)
            .filter(ApiKey.id == key_id, ApiKey.org_id == org_id)
            .first()
        )
        if not key:
            return False
        key.is_active = False
        self.db.commit()
        return True
