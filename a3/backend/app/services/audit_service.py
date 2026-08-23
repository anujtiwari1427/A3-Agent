"""Audit event recording for security-sensitive actions."""

import json
import uuid
from typing import Any, Optional
from sqlalchemy.orm import Session

from ..models.domain import AuditLog


def record_audit(
    db: Session,
    *,
    org_id: Optional[str],
    user_id: Optional[str],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    metadata: Any = None,
) -> None:
    meta_json = json.dumps(metadata) if isinstance(metadata, (dict, list)) else metadata
    db.add(
        AuditLog(
            id=str(uuid.uuid4()),
            org_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=meta_json,
        )
    )
