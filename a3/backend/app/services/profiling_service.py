"""
Profiling Service — comprehensive statistical distributions, percentiles, kurtosis, data quality scoring, and column profiling.
"""

import math
import statistics
from typing import List, Dict, Any, Tuple
from ..schemas.dataset import ColumnSchema
from ..schemas.analytics import ColumnSummary, QualityMetricBreakdown, AnalyticsResponse, ChartData


def compute_column_profile(values: List[Any], col_name: str) -> Tuple[ColumnSchema, ColumnSummary]:
    """Compute detailed 5-number summary, quartiles, skewness, kurtosis, percentiles, mode, and null counts."""
    total_count = len(values)
    null_count = sum(1 for v in values if v == "" or v is None or v == "N/A" or str(v).lower() == "nan")
    non_null_values = [v for v in values if v != "" and v is not None and v != "N/A" and str(v).lower() != "nan"]

    num_vals = [float(v) for v in non_null_values if isinstance(v, (int, float))]
    bool_vals = [v for v in non_null_values if isinstance(v, bool)]

    # Determine type
    if len(bool_vals) == len(non_null_values) and len(bool_vals) > 0:
        col_type = "boolean"
    elif len(num_vals) > len(non_null_values) * 0.7 and len(num_vals) > 0:
        col_type = "numeric"
    else:
        sample = [str(v) for v in non_null_values[:15]]
        is_date = any(("-" in s or "/" in s) and any(char.isdigit() for char in s) for s in sample)
        col_type = "date" if is_date else "string"

    distinct_count = len(set(str(v) for v in non_null_values))
    is_constant = distinct_count == 1 and total_count > 1
    is_high_cardinality = distinct_count > total_count * 0.8 and col_type == "string" and total_count > 20

    # Top frequency values
    freq: Dict[str, int] = {}
    for v in non_null_values:
        sv = str(v)
        freq[sv] = freq.get(sv, 0) + 1
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:6]
    top_values = [{"value": k, "count": count, "pct": round(count / total_count * 100, 1) if total_count else 0} for k, count in sorted_freq]

    mode_val = sorted_freq[0][0] if sorted_freq else None

    if col_type == "numeric" and num_vals:
        n = len(num_vals)
        mean_val = sum(num_vals) / n
        sorted_nums = sorted(num_vals)

        # Median
        median_val = statistics.median(sorted_nums) if n > 0 else 0.0
        min_val = sorted_nums[0]
        max_val = sorted_nums[-1]

        # Variance and Standard Deviation
        variance = sum((x - mean_val) ** 2 for x in num_vals) / n if n > 1 else 0.0
        std_dev = math.sqrt(variance)

        # Quartiles
        q1_idx = int(n * 0.25)
        q3_idx = int(n * 0.75)
        q1 = sorted_nums[q1_idx] if q1_idx < n else min_val
        q3 = sorted_nums[q3_idx] if q3_idx < n else max_val
        iqr = q3 - q1

        # Skewness
        skewness = (3 * (mean_val - median_val) / std_dev) if std_dev > 0.0001 else 0.0

        # Kurtosis: m4 / s^4 - 3 (Excess kurtosis)
        if std_dev > 0.0001 and n > 3:
            m4 = sum((x - mean_val) ** 4 for x in num_vals) / n
            kurtosis = (m4 / (variance ** 2)) - 3.0
        else:
            kurtosis = 0.0

        # Percentiles (p5, p10, p25, p50, p75, p90, p95)
        def get_pctile(p: float) -> float:
            idx = int(n * p)
            return sorted_nums[min(idx, n - 1)]

        percentiles = {
            "p5": round(get_pctile(0.05), 2),
            "p10": round(get_pctile(0.10), 2),
            "p25": round(q1, 2),
            "p50": round(median_val, 2),
            "p75": round(q3, 2),
            "p90": round(get_pctile(0.90), 2),
            "p95": round(get_pctile(0.95), 2),
        }

        # Histogram Bins (10 equal-width bins)
        hist_bins = []
        bin_count = min(10, max(4, n // 3))
        bin_width = (max_val - min_val) / bin_count if max_val > min_val else 1.0
        for b_idx in range(bin_count):
            b_start = min_val + b_idx * bin_width
            b_end = b_start + bin_width
            if b_idx == bin_count - 1:
                b_count = sum(1 for v in sorted_nums if b_start <= v <= b_end)
            else:
                b_count = sum(1 for v in sorted_nums if b_start <= v < b_end)

            hist_bins.append({
                "bin_label": f"{b_start:,.1f}-{b_end:,.1f}",
                "from": round(b_start, 2),
                "to": round(b_end, 2),
                "count": b_count,
                "pct": round(b_count / n * 100, 1) if n > 0 else 0
            })

        summary = ColumnSummary(
            mean=round(mean_val, 2),
            median=round(median_val, 2),
            mode=mode_val,
            min=round(min_val, 2),
            max=round(max_val, 2),
            std_dev=round(std_dev, 2),
            variance=round(variance, 2),
            q1=round(q1, 2),
            q3=round(q3, 2),
            iqr=round(iqr, 2),
            skewness=round(skewness, 2),
            kurtosis=round(kurtosis, 2),
            percentiles=percentiles,
            histogram_bins=hist_bins,
            null_count=null_count,
            distinct_count=distinct_count,
            top_values=top_values,
            is_constant=is_constant,
            is_high_cardinality=is_high_cardinality,
        )
    else:
        summary = ColumnSummary(
            mode=mode_val,
            null_count=null_count,
            distinct_count=distinct_count,
            top_values=top_values,
            is_constant=is_constant,
            is_high_cardinality=is_high_cardinality,
        )

    schema = ColumnSchema(
        name=col_name,
        type=col_type,
        nullable=null_count > 0,
        unique_count=distinct_count,
        null_count=null_count,
        sample_values=[v for v in non_null_values[:5]],
    )

    return schema, summary


def compute_quality_profile(
    headers: List[str],
    rows: List[Dict[str, Any]],
    columns: List[ColumnSchema],
    summaries: Dict[str, ColumnSummary]
) -> QualityMetricBreakdown:
    """Evaluate Completeness, Uniqueness, Validity, and Consistency scores with diagnostic warnings."""
    total_rows = len(rows)
    total_cols = len(headers)
    if total_rows == 0 or total_cols == 0:
        return QualityMetricBreakdown(
            completeness_score=0.0,
            uniqueness_score=0.0,
            validity_score=0.0,
            consistency_score=0.0,
            overall_score=0,
            warnings=["Dataset is empty"],
        )

    total_cells = total_rows * total_cols
    total_nulls = sum(s.null_count for s in summaries.values())
    completeness = max(0.0, min(100.0, (1 - total_nulls / total_cells) * 100))

    # Uniqueness (duplicate rows check)
    seen_rows = set()
    dup_rows = 0
    for r in rows:
        t = tuple(str(r.get(h, "")) for h in headers)
        if t in seen_rows:
            dup_rows += 1
        else:
            seen_rows.add(t)
    uniqueness = max(0.0, min(100.0, (1 - dup_rows / total_rows) * 100))

    # Validity (check constant columns, high nulls, extremes)
    validity_penalty = 0
    warnings = []

    if dup_rows > 0:
        warnings.append(f"{dup_rows} exact duplicate rows detected ({round(dup_rows/total_rows*100, 1)}% of dataset).")

    for col, summary in summaries.items():
        if summary.null_count > total_rows * 0.3:
            warnings.append(f"Column '{col}' has high missingness ({round(summary.null_count/total_rows*100, 1)}% nulls).")
            validity_penalty += 5
        if summary.is_constant:
            warnings.append(f"Column '{col}' is constant (zero variance across all rows).")
            validity_penalty += 3
        if summary.is_high_cardinality:
            warnings.append(f"Column '{col}' exhibits high cardinality (>80% unique categorical values).")

    validity = max(10.0, 100.0 - validity_penalty)
    consistency = 95.0 if completeness > 80 else 75.0

    overall = int((completeness * 0.35) + (uniqueness * 0.25) + (validity * 0.25) + (consistency * 0.15))

    return QualityMetricBreakdown(
        completeness_score=round(completeness, 1),
        uniqueness_score=round(uniqueness, 1),
        validity_score=round(validity, 1),
        consistency_score=round(consistency, 1),
        overall_score=overall,
        warnings=warnings,
    )


def generate_full_analytics(headers: List[str], rows: List[Dict[str, Any]]) -> AnalyticsResponse:
    """Generate end-to-end dataset profiling payload."""
    if not headers or not rows:
        return AnalyticsResponse(
            columns=[],
            summary={},
            quality_profile=QualityMetricBreakdown(
                completeness_score=0, uniqueness_score=0, validity_score=0, consistency_score=0, overall_score=0
            ),
            chart_data=ChartData(labels=[], values=[]),
            dataset_summary_text="No records available.",
            row_count=0,
            col_count=0,
        )

    columns: List[ColumnSchema] = []
    summaries: Dict[str, ColumnSummary] = {}

    for h in headers:
        values = [r.get(h) for r in rows]
        schema, summary = compute_column_profile(values, h)
        columns.append(schema)
        summaries[h] = summary

    quality_profile = compute_quality_profile(headers, rows, columns, summaries)

    # Build primary preview chart data
    numeric_cols = [c.name for c in columns if c.type == "numeric"]
    dim_cols = [c.name for c in columns if c.type in ("date", "string")]

    chart_labels = []
    chart_values = []
    series_name = numeric_cols[0] if numeric_cols else headers[0]

    sample_slice = rows[:20]
    for idx, r in enumerate(sample_slice):
        label = str(r.get(dim_cols[0], f"Row {idx+1}")) if dim_cols else f"Row {idx+1}"
        val = r.get(series_name, 0)
        chart_labels.append(label)
        chart_values.append(float(val) if isinstance(val, (int, float)) else 0.0)

    summary_text = (
        f"Dataset contains {len(rows):,} records and {len(headers)} columns "
        f"({len(numeric_cols)} numerical, {len(dim_cols)} categorical/temporal). "
        f"Data quality is evaluated at {quality_profile.overall_score}/100."
    )

    return AnalyticsResponse(
        columns=columns,
        summary=summaries,
        quality_profile=quality_profile,
        chart_data=ChartData(labels=chart_labels, values=chart_values, series_name=series_name),
        dataset_summary_text=summary_text,
        row_count=len(rows),
        col_count=len(headers),
    )
