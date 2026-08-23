"""
Dataset Service — handles file I/O, tabular parsing, metadata extraction, and sample datasets.
"""

import csv
import io
import json
import os
import uuid
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session as DBSession

from ..core.config import settings
from ..core.storage import StorageClient
from ..core.security import sanitize_filename
from ..models.domain import Dataset, User
from ..schemas.dataset import ColumnSchema, DatasetResponse

storage_client = StorageClient(mode=settings.MODE)

SAMPLE_BUILDERS = {
    "ecommerce": {
        "filename": "global_ecommerce_performance.csv",
        "description": "Enterprise multi-regional e-commerce transaction logs with sales, profits, and ratings.",
        "generate": lambda: (
            "Order_Date,Region,Product_Category,Sales,Profit,Units_Sold,Discount_Pct,Customer_Rating\n"
            "2026-01-05,North America,Electronics,4250.00,1280.00,14,0.05,4.8\n"
            "2026-01-08,Europe,Office Supplies,1120.50,340.20,28,0.10,4.5\n"
            "2026-01-12,Asia Pacific,Furniture,3890.00,890.50,9,0.15,4.2\n"
            "2026-01-15,North America,Electronics,5600.00,1920.00,18,0.00,4.9\n"
            "2026-01-19,Latin America,Clothing,890.00,290.00,32,0.20,4.1\n"
            "2026-01-23,Europe,Electronics,6420.00,2100.00,21,0.05,4.7\n"
            "2026-01-28,Asia Pacific,Office Supplies,1780.00,560.00,45,0.12,4.6\n"
            "2026-02-02,North America,Furniture,4920.00,1150.00,11,0.08,4.4\n"
            "2026-02-06,Europe,Clothing,1450.00,480.00,38,0.15,4.3\n"
            "2026-02-10,North America,Electronics,7890.00,2850.00,24,0.05,5.0\n"
            "2026-02-14,Asia Pacific,Electronics,8120.00,2980.00,26,0.00,4.9\n"
            "2026-02-18,Latin America,Furniture,2650.00,520.00,7,0.10,3.9\n"
            "2026-02-22,North America,Office Supplies,2340.00,780.00,52,0.05,4.7\n"
            "2026-02-26,Europe,Electronics,9450.00,3410.00,30,0.05,4.8\n"
            "2026-03-02,Asia Pacific,Furniture,5120.00,1240.00,12,0.10,4.5\n"
            "2026-03-07,North America,Clothing,2100.00,720.00,48,0.15,4.4\n"
            "2026-03-12,Europe,Office Supplies,3150.00,1050.00,60,0.08,4.8\n"
            "2026-03-16,North America,Electronics,11200.00,4100.00,35,0.00,5.0\n"
            "2026-03-21,Asia Pacific,Clothing,1890.00,610.00,42,0.10,4.6\n"
            "2026-03-26,Europe,Furniture,6800.00,1650.00,15,0.05,4.7\n"
            "2026-03-30,North America,Electronics,12850.00,4820.00,40,0.05,4.9\n"
            "2026-04-04,Latin America,Office Supplies,1420.00,410.00,31,0.18,4.2\n"
            "2026-04-09,Asia Pacific,Electronics,10500.00,3890.00,33,0.00,4.8\n"
            "2026-04-14,North America,Furniture,7400.00,1820.00,16,0.10,4.6\n"
        )
    },
    "saas": {
        "filename": "saas_revenue_and_churn.csv",
        "description": "Monthly recurring revenue, churn velocity, CAC, and LTV cohort indicators.",
        "generate": lambda: (
            "Month,MRR,New_MRR,Churned_MRR,Active_Subscribers,CAC,LTV,NPS_Score,Churn_Rate_Pct\n"
            "2025-05,48200,6500,1200,410,320,3800,54,2.48\n"
            "2025-06,53500,7100,1100,455,310,3950,56,2.05\n"
            "2025-07,59500,8200,1300,502,295,4100,58,2.18\n"
            "2025-08,66400,8900,1400,558,290,4250,59,2.10\n"
            "2025-09,73900,9800,1500,620,280,4400,61,2.02\n"
            "2025-10,82200,10500,1600,688,275,4550,63,1.94\n"
            "2025-11,91100,11400,1750,760,265,4700,64,1.92\n"
            "2025-12,100800,12500,1850,840,260,4900,66,1.83\n"
            "2026-01,111450,13800,2050,925,250,5100,68,1.83\n"
            "2026-02,123200,15100,2250,1020,245,5300,69,1.82\n"
            "2026-03,136050,16500,2450,1125,240,5500,71,1.80\n"
            "2026-04,150000,18200,2600,1240,230,5750,72,1.73\n"
        )
    },
    "fintech": {
        "filename": "fintech_transaction_risk.csv",
        "description": "Real-time payment telemetry, latency distribution, risk scoring, and authorization status.",
        "generate": lambda: (
            "Tx_ID,Timestamp,Amount_USD,Merchant_Type,Channel,Latency_MS,Risk_Score,Status\n"
            "TX-901,2026-04-01 09:12,142.50,Retail,Mobile_App,18,0.02,Approved\n"
            "TX-902,2026-04-01 09:15,3890.00,Crypto_Exchange,Web,42,0.85,Flagged\n"
            "TX-903,2026-04-01 09:22,89.90,Dining,POS_Contactless,12,0.01,Approved\n"
            "TX-904,2026-04-01 09:28,750.00,Electronics,Web,25,0.18,Approved\n"
            "TX-905,2026-04-01 09:35,12400.00,Luxury_Goods,Web,95,0.92,Flagged\n"
            "TX-906,2026-04-01 09:41,45.00,Groceries,POS_Contactless,14,0.01,Approved\n"
            "TX-907,2026-04-01 09:48,320.00,Travel,Mobile_App,22,0.09,Approved\n"
            "TX-908,2026-04-01 09:55,1850.00,Gambling,Web,68,0.78,Flagged\n"
            "TX-909,2026-04-01 10:02,12.50,Transportation,POS_Contactless,11,0.01,Approved\n"
            "TX-910,2026-04-01 10:14,2400.00,Electronics,Web,31,0.22,Approved\n"
            "TX-911,2026-04-01 10:20,590.00,Hospitality,Mobile_App,19,0.06,Approved\n"
            "TX-912,2026-04-01 10:35,8400.00,Jewelry,Web,84,0.88,Flagged\n"
        )
    }
}


def parse_bytes_to_rows(content: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Universal parser for CSV and JSON bytes into headers list and row dicts."""
    try:
        content_str = content.decode("utf-8", errors="ignore")
    except Exception:
        return [], []

    content_str = content_str.strip()
    if not content_str:
        return [], []

    # Check if JSON
    if content_str.startswith("[") or content_str.startswith("{"):
        try:
            parsed = json.loads(content_str)
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                headers = list(parsed[0].keys())
                return headers, parsed
            elif isinstance(parsed, dict):
                headers = list(parsed.keys())
                return headers, [parsed]
        except Exception:
            pass

    # Parse as CSV
    lines = content_str.splitlines()
    if not lines:
        return [], []

    # Sniff dialect or standard comma/semicolon/tab delimiter
    first_line = lines[0]
    delimiter = ","
    if "\t" in first_line:
        delimiter = "\t"
    elif ";" in first_line and first_line.count(";") > first_line.count(","):
        delimiter = ";"

    reader = csv.reader(lines, delimiter=delimiter)
    all_rows = list(reader)
    if not all_rows:
        return [], []

    headers = [h.strip() for h in all_rows[0]]
    dict_rows: List[Dict[str, Any]] = []

    for r in all_rows[1:]:
        row_dict: Dict[str, Any] = {}
        for idx, col in enumerate(headers):
            val = r[idx].strip() if idx < len(r) else ""
            if not val:
                row_dict[col] = ""
                continue

            # Try casting to float/int
            try:
                if "." in val or "e" in val.lower():
                    row_dict[col] = float(val)
                else:
                    row_dict[col] = int(val)
            except ValueError:
                if val.lower() == "true":
                    row_dict[col] = True
                elif val.lower() == "false":
                    row_dict[col] = False
                else:
                    row_dict[col] = val
        dict_rows.append(row_dict)

    return headers, dict_rows


def extract_metadata(content: bytes, filename: str) -> Tuple[str, int, int, int, int]:
    """Compute file_type, row_count, col_count, size_bytes, health_score."""
    file_type = filename.split(".")[-1].lower() if "." in filename else "csv"
    size_bytes = len(content)
    headers, rows = parse_bytes_to_rows(content)

    row_count = len(rows)
    col_count = len(headers)

    if row_count == 0 or col_count == 0:
        return file_type, row_count, col_count, size_bytes, 50

    total_cells = row_count * col_count
    empty_cells = 0
    for r in rows:
        for h in headers:
            v = r.get(h)
            if v == "" or v is None or v == "N/A":
                empty_cells += 1

    health_score = max(10, min(100, int(100 - (empty_cells / total_cells * 100))))
    return file_type, row_count, col_count, size_bytes, health_score


async def create_dataset_from_bytes(
    content: bytes,
    filename: str,
    org_id: str,
    user_id: str,
    db: DBSession,
    description: Optional[str] = None,
    is_cleaned: bool = False,
    parent_id: Optional[str] = None,
    visibility: str = "private",
) -> Dataset:
    """Save content to partitioned storage path and register Dataset record."""
    safe_name = sanitize_filename(filename)
    dataset_id = str(uuid.uuid4())
    # Secure storage path structure: {org_id}/{user_id}/datasets/{dataset_id}/{filename}
    storage_key = f"{org_id}/{user_id}/datasets/{dataset_id}/{safe_name}"
    storage_path = await storage_client.upload(content, storage_key)

    file_type, row_count, col_count, size_bytes, health_score = extract_metadata(content, safe_name)

    dataset = Dataset(
        id=dataset_id,
        org_id=org_id,
        uploaded_by=user_id,
        name=safe_name,
        description=description,
        storage_path=storage_path,
        raw_storage_path=storage_path if not is_cleaned else None,
        file_type=file_type,
        row_count=row_count,
        col_count=col_count,
        size_bytes=size_bytes,
        health_score=health_score,
        is_cleaned=is_cleaned,
        visibility=visibility,
        parent_dataset_id=parent_id,
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


async def duplicate_dataset(
    dataset_id: str,
    current_user: User,
    db: DBSession,
) -> Optional[Dataset]:
    """Create a standalone copy of an existing dataset with ownership verification."""
    from ..repositories.dataset_repository import DatasetRepository

    source_dataset = DatasetRepository(db).get_for_user(dataset_id, current_user)
    if not source_dataset:
        return None

    content = await storage_client.download(source_dataset.storage_path)
    new_name = f"Copy_of_{source_dataset.name}"
    return await create_dataset_from_bytes(
        content=content,
        filename=new_name,
        org_id=current_user.org_id,
        user_id=current_user.id,
        db=db,
        description=f"Duplicated from {source_dataset.name}",
        is_cleaned=source_dataset.is_cleaned,
        parent_id=source_dataset.id,
        visibility=getattr(source_dataset, "visibility", "private"),
    )
