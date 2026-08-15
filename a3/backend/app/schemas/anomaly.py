from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AnomalyItem(BaseModel):
    row_index: int
    column: str
    value: float
    z_score: float
    expected_mean: float
    method: str = "z_score"  # "z_score" | "iqr" | "rolling"
    severity: str  # "mild" | "high" | "critical"
    context: Dict[str, Any]


class AnomaliesResponse(BaseModel):
    total_anomalies: int
    anomaly_rate_pct: float
    method: str
    threshold: float
    scanned_columns: List[str]
    anomalies: List[AnomalyItem]
