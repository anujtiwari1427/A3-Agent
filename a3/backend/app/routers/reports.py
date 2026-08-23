"""Reports Router — executive report generation, retrieval, and download with privacy enforcement."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import User
from ..repositories.dataset_repository import DatasetRepository
from ..repositories.report_repository import ReportRepository
from ..schemas.report import ReportGenerateRequest, ReportResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.report_service import build_executive_report

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
storage_client = StorageClient(mode=settings.MODE)


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    req: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = DatasetRepository(db).get_for_user(req.dataset_id, current_user)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    return build_executive_report(
        headers=headers,
        rows=rows,
        dataset=dataset,
        req=req,
        db=db,
        user_id=current_user.id,
    )


@router.get("", response_model=List[dict])
def list_reports(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    reports = ReportRepository(db).list_for_user(current_user)
    return [
        {
            "id": r.id,
            "dataset_id": r.dataset_id,
            "title": r.title,
            "summary": r.summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]


@router.get("/{report_id}/markdown")
def download_report_markdown(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    report = ReportRepository(db).get_for_user(report_id, current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    filename = f"{report.title.replace(' ', '_').lower()}.md"
    return Response(
        content=report.content_markdown.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
