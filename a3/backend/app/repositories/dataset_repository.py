"""Database access and privacy-enforced queries for Dataset entities."""

from typing import Optional, List
from sqlalchemy.orm import Session

from ..core.authorization import can_access_dataset
from ..core.config import settings
from ..models.domain import Dataset, User


class DatasetRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_user(self, dataset_id: str, current_user: User) -> Optional[Dataset]:
        """Fetch dataset only if authorized for current_user."""
        dataset = (
            self.db.query(Dataset)
            .filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id)
            .first()
        )
        if not dataset:
            return None
        if not can_access_dataset(dataset, current_user):
            return None
        return dataset

    def list_for_user(
        self, current_user: User, offset: int = 0, limit: int = 50
    ) -> List[Dataset]:
        """List datasets accessible to current_user."""
        q = self.db.query(Dataset).filter(Dataset.org_id == current_user.org_id)
        if settings.MODE == "local":
            # Strict personal ownership in local mode
            q = q.filter(Dataset.uploaded_by == current_user.id)
        else:
            # Cloud mode: own datasets OR organization-visible datasets
            q = q.filter(
                (Dataset.uploaded_by == current_user.id)
                | (Dataset.visibility == "organization")
            )
        return (
            q.order_by(Dataset.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_for_user(self, current_user: User) -> int:
        """Count datasets accessible to current_user."""
        q = self.db.query(Dataset).filter(Dataset.org_id == current_user.org_id)
        if settings.MODE == "local":
            q = q.filter(Dataset.uploaded_by == current_user.id)
        else:
            q = q.filter(
                (Dataset.uploaded_by == current_user.id)
                | (Dataset.visibility == "organization")
            )
        return q.count()

    def get_for_org(self, dataset_id: str, org_id: str) -> Optional[Dataset]:
        """Legacy internal helper scoped by organization."""
        return (
            self.db.query(Dataset)
            .filter(Dataset.id == dataset_id, Dataset.org_id == org_id)
            .first()
        )

    def list_for_org(self, org_id: str, offset: int = 0, limit: int = 50) -> List[Dataset]:
        return (
            self.db.query(Dataset)
            .filter(Dataset.org_id == org_id)
            .order_by(Dataset.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def save(self, dataset: Dataset) -> Dataset:
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        return dataset

    def delete(self, dataset: Dataset) -> None:
        self.db.delete(dataset)
        self.db.commit()
