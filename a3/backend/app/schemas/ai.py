from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AIChatRequest(BaseModel):
    dataset_id: Optional[str] = None
    message: str
    context_mode: str = "statistical"  # "statistical" | "exploratory" | "executive"


class AIInsightItem(BaseModel):
    category: str  # "FACT" | "OBSERVATION" | "RECOMMENDATION"
    title: str
    detail: str
    confidence: float = 0.95
    metric_reference: Optional[str] = None


class AIChatResponse(BaseModel):
    reply: str
    intent: str  # "summary" | "correlation" | "anomaly" | "forecast" | "cleaning" | "chart" | "general"
    suggested_action: Optional[str] = None
    suggested_view: Optional[str] = None
    insights: List[AIInsightItem] = []
    plot_data: Optional[Dict[str, Any]] = None
    execution_time_ms: int = 0
