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
    2. Owner access: Dataset is strictly private to the direct owner (dataset.uploaded_by == current_user.id).
    """
    if dataset is None or current_user is None:
        return False

    if dataset.org_id != current_user.org_id:
        return False

    # Direct uploader has full access
    return dataset.uploaded_by == current_user.id


def can_access_report(report: Optional[Report], current_user: Optional[User]) -> bool:
    """Evaluate whether current_user is authorized to access report."""
    if report is None or current_user is None:
        return False

    if report.org_id != current_user.org_id:
        return False

    return report.created_by == current_user.id


def can_access_job(job: Optional[Job], current_user: Optional[User]) -> bool:
    """Evaluate whether current_user is authorized to access job."""
    if job is None or current_user is None:
        return False

    if job.org_id != current_user.org_id:
        return False

    return job.user_id == current_user.id
