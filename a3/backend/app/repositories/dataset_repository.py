"""Database access for Dataset entities."""

from typing import Optional
from sqlalchemy.orm import Session

from ..models.domain import Dataset


class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_org(self, dataset_id: str, org_id: str) -> Optional[Dataset]:
        return (
            self.db.query(Dataset)
            .filter(Dataset.id == dataset_id, Dataset.org_id == org_id)
            .first()
        )

    def list_for_org(self, org_id: str, offset: int = 0, limit: int = 50) -> list[Dataset]:
        return (
            self.db.query(Dataset)
            .filter(Dataset.org_id == org_id)
            .order_by(Dataset.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_for_org(self, org_id: str) -> int:
        return self.db.query(Dataset).filter(Dataset.org_id == org_id).count()

    def save(self, dataset: Dataset) -> Dataset:
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def delete(self, dataset: Dataset) -> None:
        self.db.delete(dataset)
        self.db.commit()
