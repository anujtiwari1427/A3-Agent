"""AI Copilot Router — conversational dataset reasoning with privacy enforcement."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import User
from ..repositories.dataset_repository import DatasetRepository
from ..schemas.ai import AIChatRequest, AIChatResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.ai_copilot_service import process_copilot_query

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
storage_client = StorageClient(mode=settings.MODE)


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat_query(
    req: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    headers = []
    rows = []
    dataset_name = "System Workspace"

    if req.dataset_id:
        dataset = DatasetRepository(db).get_for_user(req.dataset_id, current_user)
        if dataset:
            dataset_name = dataset.name
            content = await storage_client.download(dataset.storage_path)
            headers, rows = parse_bytes_to_rows(content)

    return process_copilot_query(headers, rows, dataset_name, req)
