"""Database access for AuditLog entities."""

import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session

from ..models.domain import AuditLog


class AuditRepository:
    def __init__(self, db: Session):
        self.db = db

    def record(
        self,
        org_id: Optional[str],
        user_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        meta_str = json.dumps(metadata) if metadata else None
        log = AuditLog(
            org_id=org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=meta_str,
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def list_for_org(self, org_id: str, offset: int = 0, limit: int = 50) -> list[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.org_id == org_id)
            .order_by(AuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def list_for_user(self, user_id: str, offset: int = 0, limit: int = 50) -> list[AuditLog]:
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
