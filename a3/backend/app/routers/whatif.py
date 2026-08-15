"""
What-If Router — parameter simulation and driver modeling endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from ..core.auth import get_current_user
from ..core.config import settings
from ..core.database import get_db
from ..core.storage import StorageClient
from ..models.domain import Dataset, User
from ..schemas.whatif import WhatIfRequest, WhatIfResponse
from ..services.dataset_service import parse_bytes_to_rows
from ..services.whatif_service import run_what_if_simulation

router = APIRouter(prefix="/api/v1/datasets", tags=["whatif"])
storage_client = StorageClient(mode=settings.MODE)


@router.post("/{dataset_id}/whatif", response_model=WhatIfResponse)
async def simulate_what_if(
    dataset_id: str,
    req: WhatIfRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.org_id == current_user.org_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    content = await storage_client.download(dataset.storage_path)
    headers, rows = parse_bytes_to_rows(content)

    return run_what_if_simulation(headers, rows, req)
