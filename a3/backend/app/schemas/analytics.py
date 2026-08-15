from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from .dataset import ColumnSchema


class ColumnSummary(BaseModel):
    mean: Optional[float] = None
    median: Optional[float] = None
    mode: Optional[Any] = None
    min: Optional[float] = None
    max: Optional[float] = None
    std_dev: Optional[float] = None
    variance: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    percentiles: Optional[Dict[str, float]] = None
    histogram_bins: Optional[List[Dict[str, Any]]] = None
    null_count: int = 0
    distinct_count: int = 0
    top_values: Optional[List[Dict[str, Any]]] = None
    is_constant: bool = False
    is_high_cardinality: bool = False


class QualityMetricBreakdown(BaseModel):
    completeness_score: float
    uniqueness_score: float
    validity_score: float
    consistency_score: float
    overall_score: int
    warnings: List[str] = []


class ChartData(BaseModel):
    labels: List[str]
    values: List[float]
    series_name: Optional[str] = None


class AnalyticsResponse(BaseModel):
    columns: List[ColumnSchema]
    summary: Dict[str, ColumnSummary]
    quality_profile: QualityMetricBreakdown
    chart_data: ChartData
    dataset_summary_text: Optional[str] = None
    row_count: int
    col_count: int


class CorrelationPair(BaseModel):
    col_a: str
    col_b: str
    pearson: float
    spearman: float
    strength: str  # "strong_positive" | "moderate_positive" | "none" | "moderate_negative" | "strong_negative"


class CorrelationResponse(BaseModel):
    columns: List[str]
    matrix: Dict[str, Dict[str, float]]
    top_correlations: List[CorrelationPair]


class RegressionResponse(BaseModel):
    feature_column: str
    target_column: str
    slope: float
    intercept: float
    r_squared: float
    std_error: float
    sample_points: List[Dict[str, float]]
    equation: str


class GroupByBucket(BaseModel):
    group_key: str
    count: int
    aggregates: Dict[str, float]


class GroupByResponse(BaseModel):
    group_column: str
    metric_columns: List[str]
    buckets: List[GroupByBucket]


class HypothesisTestRequest(BaseModel):
    group_column: str
    segment_a: str
    segment_b: str
    metric_column: str
    confidence_level: float = 0.95


class HypothesisTestResponse(BaseModel):
    group_column: str
    segment_a: str
    segment_b: str
    metric_column: str
    mean_a: float
    mean_b: float
    std_a: float
    std_b: float
    count_a: int
    count_b: int
    mean_difference: float
    ci_lower: float
    ci_upper: float
    confidence_level: float
    t_statistic: float
    p_value: float
    is_significant: bool
    conclusion: str
