from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ColumnRenameRule(BaseModel):
    old_name: str
    new_name: str


class ColumnCastRule(BaseModel):
    column: str
    target_type: str  # "numeric" | "string" | "date" | "boolean"


class CleanRequest(BaseModel):
    drop_duplicates: bool = True
    impute_numeric: Optional[str] = "mean"  # "mean" | "median" | "zero" | "drop" | "none"
    impute_categorical: Optional[str] = "mode"  # "mode" | "placeholder" | "drop" | "none"
    custom_null_placeholder: Optional[str] = "Unknown"
    outlier_handling: Optional[str] = "none"  # "none" | "clip" | "drop"
    standardize_text: Optional[bool] = True
    trim_whitespace: Optional[bool] = True
    case_normalization: Optional[str] = "none"  # "none" | "lower" | "upper" | "title"
    normalize_dates: Optional[bool] = True
    rename_columns: Optional[List[ColumnRenameRule]] = None
    drop_columns: Optional[List[str]] = None
    type_casts: Optional[List[ColumnCastRule]] = None
    create_new_version: bool = False  # If True, creates new dataset without touching the current


class CleanOperationLog(BaseModel):
    timestamp: str
    operation: str
    affected_rows: int
    affected_columns: List[str]
    details: str


class CleanPreviewResponse(BaseModel):
    original_row_count: int
    cleaned_row_count: int
    removed_duplicates: int
    imputed_nulls: int
    handled_outliers: int
    preview_columns: List[str]
    preview_original_rows: List[Dict[str, Any]]
    preview_cleaned_rows: List[Dict[str, Any]]
    changes_summary: List[str]
