import uuid
from sqlalchemy import Column, String, Boolean, Integer, BigInteger, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


class Org(Base):
    __tablename__ = "orgs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    plan = Column(String(20), default="free")
    created_at = Column(DateTime, default=func.now())

    users = relationship("User", back_populates="org", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="org", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default="analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    org = relationship("Org", back_populates="users")
    sessions = relationship("Session", back_populates="user")
    datasets = relationship("Dataset", back_populates="uploader")


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    uploaded_by = Column(String, ForeignKey("users.id"))
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    storage_path = Column(String(500), nullable=False)
    raw_storage_path = Column(String(500), nullable=True)
    file_type = Column(String(20))
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)
    size_bytes = Column(BigInteger, default=0)
    health_score = Column(Integer, default=100)
    is_cleaned = Column(Boolean, default=False)
    parent_dataset_id = Column(String, nullable=True)
    cleaning_log = Column(Text, nullable=True)  # JSON-encoded array of applied cleaning operations
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    org = relationship("Org", back_populates="datasets")
    uploader = relationship("User", back_populates="datasets")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    dataset_id = Column(String, ForeignKey("datasets.id", ondelete="CASCADE"))
    created_by = Column(String, ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    content_markdown = Column(Text, nullable=False)
    content_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    dataset = relationship("Dataset", back_populates="reports")


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id"))
    dataset_id = Column(String, ForeignKey("datasets.id"))
    title = Column(String(255))
    mode = Column(String(10))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="sessions")
    messages = relationship("SessionMessage", back_populates="session", cascade="all, delete-orphan")


class SessionMessage(Base):
    __tablename__ = "session_messages"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"))
    role = Column(String(20))
    agent_name = Column(String(30))
    content = Column(String)
    content_type = Column(String(20))
    elapsed_ms = Column(Integer)
    created_at = Column(DateTime, default=func.now())

    session = relationship("Session", back_populates="messages")


class Dashboard(Base):
    __tablename__ = "dashboards"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    created_by = Column(String, ForeignKey("users.id"))
    title = Column(String(255))
    visibility = Column(String(20), default="private")
    public_slug = Column(String(100), unique=True)
    created_at = Column(DateTime, default=func.now())


class UsageEvent(Base):
    __tablename__ = "usage_events"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id"))
    event_type = Column(String(50))
    agent_name = Column(String(30))
    tokens_used = Column(Integer, default=0)
    compute_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
