export type ViewType =
  | "overview"
  | "datasets"
  | "profile"
  | "cleaning"
  | "analytics"
  | "graph-studio"
  | "forecasting"
  | "anomalies"
  | "whatif"
  | "copilot"
  | "reports";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
  mode: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

export interface DatasetInfo {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  file_type: string;
  row_count: number;
  col_count: number;
  size_bytes: number;
  health_score: number;
  is_cleaned?: boolean;
  parent_dataset_id?: string | null;
  created_at?: string;
}

export interface ColumnSchema {
  name: string;
  type: "numeric" | "string" | "date" | "boolean";
  nullable: boolean;
  unique_count: number;
  null_count: number;
  sample_values?: JsonValue[];
}

export interface HistogramBin {
  bin_label: string;
  from: number;
  to: number;
  count: number;
  pct: number;
}

export interface ColumnSummary {
  mean?: number | null;
  median?: number | null;
  mode?: JsonValue;
  min?: number | null;
  max?: number | null;
  std_dev?: number | null;
  variance?: number | null;
  q1?: number | null;
  q3?: number | null;
  iqr?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  percentiles?: Record<string, number> | null;
  histogram_bins?: HistogramBin[] | null;
  null_count: number;
  distinct_count: number;
  top_values?: Array<{ value: string; count: number; pct?: number }>;
  is_constant?: boolean;
  is_high_cardinality?: boolean;
}

export interface QualityProfile {
  completeness_score: number;
  uniqueness_score: number;
  validity_score: number;
  consistency_score: number;
  overall_score: number;
  warnings: string[];
}

export interface AnalyticsData {
  columns: ColumnSchema[];
  summary: Record<string, ColumnSummary>;
  quality_profile: QualityProfile;
  chart_data: {
    labels: string[];
    values: number[];
    series_name?: string;
  };
  dataset_summary_text?: string | null;
  row_count: number;
  col_count: number;
}

export interface ForecastPoint {
  step: number;
  label: string;
  forecast: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastData {
  metric_column: string;
  dimension_column?: string | null;
  horizon: number;
  trend_slope: number;
  growth_rate_pct: number;
  r_squared: number;
  history: Array<{ step: number; label: string; value: number }>;
  forecast: ForecastPoint[];
  model_type: string;
  confidence_interval: string;
  status: string;
  message?: string | null;
}

export interface AnomalyItem {
  row_index: number;
  column: string;
  value: number;
  z_score: number;
  expected_mean: number;
  method: string;
  severity: "mild" | "high" | "critical";
  context: JsonObject;
}

export interface AnomaliesData {
  total_anomalies: number;
  anomaly_rate_pct: number;
  method: string;
  threshold: number;
  scanned_columns: string[];
  anomalies: AnomalyItem[];
}

export interface CorrelationPair {
  col_a: string;
  col_b: string;
  pearson: number;
  spearman: number;
  strength: "strong_positive" | "moderate_positive" | "none" | "moderate_negative" | "strong_negative";
}

export interface CorrelationData {
  columns: string[];
  matrix: Record<string, Record<string, number>>;
  top_correlations: CorrelationPair[];
}

export interface RegressionData {
  feature_column: string;
  target_column: string;
  slope: number;
  intercept: number;
  r_squared: number;
  std_error: number;
  sample_points: Array<{ x: number; y: number; fitted: number }>;
  equation: string;
}

export interface GroupByData {
  group_column: string;
  metric_columns: string[];
  buckets: Array<{
    group_key: string;
    count: number;
    aggregates: Record<string, number>;
  }>;
}

export interface HypothesisTestData {
  group_column: string;
  segment_a: string;
  segment_b: string;
  metric_column: string;
  mean_a: number;
  mean_b: number;
  std_a: number;
  std_b: number;
  count_a: number;
  count_b: number;
  mean_difference: number;
  ci_lower: number;
  ci_upper: number;
  confidence_level: number;
  t_statistic: number;
  p_value: number;
  is_significant: boolean;
  conclusion: string;
}

export interface CleaningRequest {
  drop_duplicates?: boolean;
  impute_numeric?: "mean" | "median" | "zero" | "drop" | "none";
  impute_categorical?: "mode" | "placeholder" | "drop" | "none";
  custom_null_placeholder?: string;
  outlier_handling?: "none" | "clip" | "drop";
  trim_whitespace?: boolean;
  case_normalization?: "none" | "lower" | "upper" | "title";
  normalize_dates?: boolean;
  rename_columns?: Array<{ old_name: string; new_name: string }>;
  drop_columns?: string[];
  create_new_version?: boolean;
  standardize_text?: boolean;
}

export interface CleanPreviewData {
  original_row_count: number;
  cleaned_row_count: number;
  removed_duplicates: number;
  imputed_nulls: number;
  handled_outliers: number;
  preview_columns: string[];
  preview_original_rows: JsonObject[];
  preview_cleaned_rows: JsonObject[];
  changes_summary: string[];
}

export interface WhatIfVariableImpact {
  variable: string;
  baseline_avg: number;
  simulated_avg: number;
  delta_pct: number;
  contribution_to_target: number;
}

export interface WhatIfDriverVariable {
  variable_name: string;
  percentage_change: number;
}

export interface WhatIfRequest {
  target_metric: string;
  scenario_name?: string;
  formula_type?: "linear" | "multiplicative" | "elasticity";
  driver_variables?: WhatIfDriverVariable[];
}

export interface WhatIfData {
  target_metric: string;
  scenario_name: string;
  baseline_total: number;
  simulated_total: number;
  delta_value: number;
  delta_percentage: number;
  baseline_avg: number;
  simulated_avg: number;
  variable_impacts: WhatIfVariableImpact[];
  disclaimer: string;
  simulation_points: Array<{ label: string; baseline: number; simulated: number; delta: number }>;
}

export interface AIInsight {
  category: "FACT" | "OBSERVATION" | "RECOMMENDATION";
  title: string;
  detail: string;
  confidence: number;
  metric_reference?: string;
}

export interface AIChatRequest {
  message: string;
  dataset_id?: string | null;
  conversation_id?: string | null;
}

export interface AIChatResponse {
  reply: string;
  intent?: string;
  insights?: AIInsight[];
  suggested_action?: string | null;
  suggested_view?: string | null;
  plot_data?: JsonValue;
  execution_time_ms: number;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  intent?: string;
  insights?: AIInsight[];
  suggested_action?: string | null;
  suggested_view?: string | null;
  plot_data?: JsonValue;
  timestamp?: string;
}

export interface ReportSection {
  heading: string;
  content: string;
  highlights: string[];
  table_data?: JsonObject[];
}

export interface ReportData {
  id: string;
  dataset_id: string;
  dataset_name: string;
  title: string;
  generated_at: string;
  data_quality_score: number;
  total_records: number;
  total_columns: number;
  executive_summary: string;
  sections: ReportSection[];
  markdown_content: string;
  json_structure: JsonObject;
}

export interface APIError {
  detail: string;
  error_code?: string;
  status_code?: number;
}

export type DatasetRow = Record<string, JsonValue>;

export type CleaningResponse = CleanPreviewData & {
  success: boolean;
  new_dataset_id?: string | null;
};

export type AnalyticsResponse = AnalyticsData;
export type ForecastResponse = ForecastData;
export type AnomalyResponse = AnomaliesData;
export type WhatIfResponse = WhatIfData;
export type ReportResponse = ReportData;

export interface ChartData {
  labels: string[];
  values: number[];
  series_name?: string;
}

export interface JobInfo {
  id: string;
  org_id: string;
  job_type: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress_pct: number;
  result?: JsonValue;
  error_message?: string | null;
  created_at: string;
  updated_at?: string;
}
