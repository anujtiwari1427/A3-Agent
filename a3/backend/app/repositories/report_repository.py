"""Database access for Report entities."""

from typing import Optional
from sqlalchemy.orm import Session

from ..models.domain import Report


class ReportRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_org(self, report_id: str, org_id: str) -> Optional[Report]:
        return (
            self.db.query(Report)
            .filter(Report.id == report_id, Report.org_id == org_id)
            .first()
        )

    def list_for_org(
        self, org_id: str, dataset_id: Optional[str] = None, offset: int = 0, limit: int = 50
    ) -> list[Report]:
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
