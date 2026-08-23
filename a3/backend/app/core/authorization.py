"""Centralized Authorization & Privacy Policy Engine."""

from typing import Optional
from .config import settings
from ..models.domain import Dataset, Report, Job, User


def can_access_dataset(
    dataset: Optional[Dataset],
    current_user: Optional[User],
    required_permission: str = "viewer",
) -> bool:
    """
    Evaluate whether current_user is authorized to access dataset.
    
    Security Policy:
    1. Organization isolation: dataset.org_id MUST strictly match current_user.org_id.
    2. Owner access: If dataset.uploaded_by == current_user.id -> Granted.
    3. Mode / Sharing policy:
       - LOCAL / Personal Mode: Private by default. Only direct owner can access.
       - CLOUD / Team Mode:
         * If dataset.visibility == 'organization' -> All org members can view.
         * If current_user.role in ('owner', 'admin') and visibility != 'restricted' -> Granted.
         * Otherwise private to uploader.
    """
    if dataset is None or current_user is None:
        return False

    if dataset.org_id != current_user.org_id:
        return False

    # Direct uploader has full access
    if dataset.uploaded_by == current_user.id:
        return True

    # Cloud mode team sharing
    if settings.MODE == "cloud":
        visibility = getattr(dataset, "visibility", "private")
        if visibility == "organization":
            return True
        if current_user.role in ("owner", "admin") and visibility != "restricted":
            return True

    return False


def can_access_report(report: Optional[Report], current_user: Optional[User]) -> bool:
    """Evaluate whether current_user is authorized to access report."""
    if report is None or current_user is None:
        return False

    if report.org_id != current_user.org_id:
        return False

    if report.created_by == current_user.id:
        return True

    if settings.MODE == "cloud":
        return True

    return False


def can_access_job(job: Optional[Job], current_user: Optional[User]) -> bool:
    """Evaluate whether current_user is authorized to access job."""
    if job is None or current_user is None:
        return False

    if job.org_id != current_user.org_id:
        return False

    if job.user_id == current_user.id:
        return True

    if settings.MODE == "cloud" and current_user.role in ("owner", "admin"):
        return True

    return False
