"""Database access for User and Org entities."""

from typing import Optional
from sqlalchemy.orm import Session

from ..models.domain import User, Org


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_for_org(self, user_id: str, org_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id, User.org_id == org_id).first()

    def list_for_org(self, org_id: str, offset: int = 0, limit: int = 50) -> list[User]:
        return (
            self.db.query(User)
            .filter(User.org_id == org_id)
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()


class OrgRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, org_id: str) -> Optional[Org]:
        return self.db.query(Org).filter(Org.id == org_id).first()

    def get_by_slug(self, slug: str) -> Optional[Org]:
        return self.db.query(Org).filter(Org.slug == slug).first()

    def save(self, org: Org) -> Org:
        self.db.add(org)
        self.db.commit()
        self.db.refresh(org)
        return org
