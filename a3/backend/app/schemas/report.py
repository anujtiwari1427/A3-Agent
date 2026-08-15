from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    dataset_id: str
    title: Optional[str] = None
    include_kpis: bool = True
    include_correlations: bool = True
    include_anomalies: bool = True
    include_forecast: bool = True
    include_insights: bool = True
    forecast_horizon: int = 30


class ReportSection(BaseModel):
    heading: str
    content: str
    highlights: List[str] = []
    table_data: Optional[List[Dict[str, Any]]] = None


class ReportResponse(BaseModel):
    id: str
    dataset_id: str
    dataset_name: str
    title: str
    generated_at: str
    data_quality_score: int
    total_records: int
    total_columns: int
    executive_summary: str
    sections: List[ReportSection]
    markdown_content: str
    json_structure: Dict[str, Any]
