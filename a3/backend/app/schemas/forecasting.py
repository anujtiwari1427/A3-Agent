from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ForecastPoint(BaseModel):
    step: int
    label: str
    forecast: float
    lower_bound: float
    upper_bound: float


class ForecastRequest(BaseModel):
    metric_column: str
    dimension_column: Optional[str] = None
    horizon: int = 30
    model_type: str = "linear"  # "linear" | "exponential" | "moving_average"
    confidence: float = 0.95    # 0.80 | 0.95 | 0.99


class ForecastResponse(BaseModel):
    metric_column: str
    dimension_column: Optional[str] = None
    horizon: int
    trend_slope: float
    growth_rate_pct: float
    r_squared: float
    history: List[Dict[str, Any]]
    forecast: List[ForecastPoint]
    model_type: str
    confidence_interval: str
    status: str = "success"
    message: Optional[str] = None
