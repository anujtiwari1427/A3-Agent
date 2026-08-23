"""Audit event recording for security-sensitive actions."""

import uuid
from sqlalchemy.orm import Session

from ..models.domain import AuditLog


def record_audit(
    db: Session,
    *,
    org_id: str | None,
    user_id: str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: str | None = None,
) -> None:
    db.add(
        AuditLog(
            id=str(uuid.uuid4()),
            org_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata,
        )
    )
