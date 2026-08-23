"""API Key Management HTTP Endpoints with user and workspace privacy scoping."""

from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user, require_role
from ..core.database import get_db
from ..models.domain import User
from ..repositories.api_key_repository import ApiKeyRepository
from ..repositories.audit_repository import AuditRepository
from ..schemas.api_key import ApiKeyCreateRequest, ApiKeyCreatedResponse, ApiKeyResponse

router = APIRouter(prefix="/api/v1/api-keys", tags=["api-keys"])


def _require_org(user: User) -> str:
    if not user.org_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")
    return user.org_id


@router.post("", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: ApiKeyCreateRequest,
    current_user: User = Depends(require_role("admin")),
    db: DBSession = Depends(get_db),
):
    org_id = _require_org(current_user)
    repo = ApiKeyRepository(db)
    key_record, raw_token = repo.create(
        org_id=org_id,
        user_id=current_user.id,
        name=body.name,
        role=body.role,
    )
    if body.expires_in_days:
        key_record.expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)
        db.commit()
        db.refresh(key_record)

    AuditRepository(db).record(
        org_id=org_id,
        user_id=current_user.id,
        action="api_key.created",
        resource_type="api_key",
        resource_id=key_record.id,
        metadata={"name": body.name, "role": body.role},
    )

    return ApiKeyCreatedResponse(
        id=key_record.id,
        name=key_record.name,
        key_prefix=key_record.key_prefix,
        role=key_record.role,
        raw_key=raw_token,
        is_active=key_record.is_active,
        created_at=key_record.created_at,
        expires_at=key_record.expires_at,
    )


@router.get("", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_user: User = Depends(require_role("admin")),
    db: DBSession = Depends(get_db),
):
    repo = ApiKeyRepository(db)
    keys = repo.list_for_user(current_user)
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            role=k.role,
            is_active=k.is_active,
            created_at=k.created_at,
            last_used_at=k.last_used_at,
            expires_at=k.expires_at,
        )
        for k in keys
    ]


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    key_id: str,
    current_user: User = Depends(require_role("admin")),
    db: DBSession = Depends(get_db),
):
    repo = ApiKeyRepository(db)
    revoked = repo.revoke_for_user(key_id, current_user)
    if not revoked:
        raise HTTPException(status_code=404, detail="API key not found")
    AuditRepository(db).record(
        org_id=current_user.org_id,
        user_id=current_user.id,
        action="api_key.revoked",
        resource_type="api_key",
        resource_id=key_id,
    )
