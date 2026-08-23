import uuid
from sqlalchemy import Column, String, Boolean, Integer, BigInteger, ForeignKey, DateTime, Text, Index
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
    identities = relationship("UserIdentity", back_populates="user", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_users_org_id", "org_id"),
    )


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
    visibility = Column(String(20), default="private", nullable=False)  # "private" | "organization"
    parent_dataset_id = Column(String, nullable=True)
    cleaning_log = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    org = relationship("Org", back_populates="datasets")
    uploader = relationship("User", back_populates="datasets")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_datasets_org_created", "org_id", "created_at"),
        Index("ix_datasets_org_name", "org_id", "name"),
        Index("ix_datasets_org_uploader", "org_id", "uploaded_by"),
        Index("ix_datasets_uploaded_by", "uploaded_by"),
    )


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
    __table_args__ = (
        Index("ix_reports_created_by", "created_by"),
        Index("ix_reports_org_created_by", "org_id", "created_by"),
    )


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


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String(80), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    __table_args__ = (
        Index("ix_audit_org_created", "org_id", "created_at"),
        Index("ix_audit_user_created", "user_id", "created_at"),
    )


class Job(Base):
    __tablename__ = "jobs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    job_type = Column(String(50), nullable=False)
    status = Column(String(20), default="QUEUED", nullable=False)  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress_pct = Column(Integer, default=0)
    payload_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    __table_args__ = (
        Index("ix_jobs_org_created", "org_id", "created_at"),
        Index("ix_jobs_org_status", "org_id", "status"),
    )


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey("orgs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    key_prefix = Column(String(16), nullable=False)
    key_hash = Column(String(64), unique=True, nullable=False)
    role = Column(String(20), default="analyst", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    last_used_at = Column(DateTime, nullable=True)
    __table_args__ = (
        Index("ix_api_keys_hash", "key_hash"),
        Index("ix_api_keys_org", "org_id", "is_active"),
    )


class UserIdentity(Base):
    __tablename__ = "user_identities"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # e.g., "google", "github"
    provider_subject = Column(String(255), nullable=False)  # Provider's stable subject ID (Google sub)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    user = relationship("User", back_populates="identities")
    __table_args__ = (
        Index("ix_user_identities_user_id", "user_id"),
        Index("ix_user_identities_provider_sub", "provider", "provider_subject", unique=True),
    )


