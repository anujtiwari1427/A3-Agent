"""Database access and privacy-enforced queries for Report entities."""

from typing import Optional, List
from sqlalchemy.orm import Session

from ..core.authorization import can_access_report
from ..core.config import settings
from ..models.domain import Report, User


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_user(self, report_id: str, current_user: User) -> Optional[Report]:
        """Fetch report only if authorized for current_user."""
        report = (
            self.db.query(Report)
            .filter(Report.id == report_id, Report.org_id == current_user.org_id)
            .first()
        )
        if not report:
            return None
        if not can_access_report(report, current_user):
            return None
        return report

    def list_for_user(
        self,
        current_user: User,
        dataset_id: Optional[str] = None,
        offset: int = 0,
        limit: int = 50,
    ) -> List[Report]:
        """List reports accessible to current_user."""
        q = self.db.query(Report).filter(Report.org_id == current_user.org_id)
        if settings.MODE == "local":
            q = q.filter(Report.created_by == current_user.id)
        if dataset_id:
            q = q.filter(Report.dataset_id == dataset_id)
        return (
            q.order_by(Report.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_for_user(self, current_user: User) -> int:
        q = self.db.query(Report).filter(Report.org_id == current_user.org_id)
        if settings.MODE == "local":
            q = q.filter(Report.created_by == current_user.id)
        return q.count()

    def get_for_org(self, report_id: str, org_id: str) -> Optional[Report]:
        return (
            self.db.query(Report)
            .filter(Report.id == report_id, Report.org_id == org_id)
            .first()
        )

    def list_for_org(
        self, org_id: str, dataset_id: Optional[str] = None, offset: int = 0, limit: int = 50
    ) -> List[Report]:
        q = self.db.query(Report).filter(Report.org_id == org_id)
        if dataset_id:
            q = q.filter(Report.dataset_id == dataset_id)
        return q.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()

    def count_for_org(self, org_id: str) -> int:
        return self.db.query(Report).filter(Report.org_id == org_id).count()

    def save(self, report: Report) -> Report:
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

    def delete(self, report: Report) -> None:
        self.db.delete(report)
        self.db.commit()
