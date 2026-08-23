"""Administrative audit log endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from ..core.auth import get_current_user
from ..core.database import get_db
from ..models.domain import AuditLog, User

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    action: str
    resource_type: str
    resource_id: str | None
    metadata_json: str | None
    created_at: object


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"admin", "owner"}:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return (
        db.query(AuditLog)
        .filter(AuditLog.org_id == current_user.org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
