"""
Cleaning Service — non-destructive data cleaning engine, preview diff generator, and transformation pipeline.
"""

import csv
import io
import math
import statistics
import datetime
from typing import List, Dict, Any, Tuple, Optional
from ..schemas.cleaning import CleanRequest, CleanPreviewResponse, CleanOperationLog


def parse_date_safely(val: Any) -> Optional[str]:
    """Attempt parsing diverse date formats into standard YYYY-MM-DD."""
    if not val or val == "N/A":
        return None
    s = str(val).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%Y-%m-%d %H:%M:%S", "%m-%d-%Y"):
        try:
            dt = datetime.datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def apply_cleaning_pipeline(
    headers: List[str],
    rows: List[Dict[str, Any]],
    req: CleanRequest
) -> Tuple[List[str], List[Dict[str, Any]], CleanPreviewResponse, List[CleanOperationLog]]:
    """Execute cleaning transformations non-destructively and return cleaned headers, rows, preview stats, and audit log."""
    original_row_count = len(rows)
    changes_summary: List[str] = []
    logs: List[CleanOperationLog] = []

    working_headers = list(headers)
    working_rows = [dict(r) for r in rows]

    # 1. Drop Columns
    if req.drop_columns:
        cols_to_drop = [c for c in req.drop_columns if c in working_headers]
        if cols_to_drop:
            working_headers = [h for h in working_headers if h not in cols_to_drop]
            for r in working_rows:
                for c in cols_to_drop:
                    r.pop(c, None)
            changes_summary.append(f"Dropped {len(cols_to_drop)} columns: {', '.join(cols_to_drop)}.")
            logs.append(CleanOperationLog(
                timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                operation="drop_columns",
                affected_rows=len(working_rows),
                affected_columns=cols_to_drop,
                details=f"Removed columns: {cols_to_drop}"
            ))

    # 2. Column Renaming
    if req.rename_columns:
        rename_map = {rule.old_name: rule.new_name for rule in req.rename_columns if rule.old_name in working_headers}
        if rename_map:
            working_headers = [rename_map.get(h, h) for h in working_headers]
            for r in working_rows:
                for old_k, new_k in rename_map.items():
                    if old_k in r:
                        r[new_k] = r.pop(old_k)
            changes_summary.append(f"Renamed {len(rename_map)} columns: {', '.join([f'{k} -> {v}' for k, v in rename_map.items()])}.")
            logs.append(CleanOperationLog(
                timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                operation="rename_columns",
                affected_rows=len(working_rows),
                affected_columns=list(rename_map.values()),
                details=f"Renamed columns: {rename_map}"
            ))

    # 3. Drop Exact Duplicates
    removed_duplicates = 0
    if req.drop_duplicates:
        unique_rows = []
        seen = set()
        for r in working_rows:
            t = tuple(str(r.get(h, "")) for h in working_headers)
            if t not in seen:
                seen.add(t)
                unique_rows.append(r)
            else:
                removed_duplicates += 1
        working_rows = unique_rows
        if removed_duplicates > 0:
            changes_summary.append(f"Dropped {removed_duplicates} duplicate records.")
            logs.append(CleanOperationLog(
                timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                operation="drop_duplicates",
                affected_rows=removed_duplicates,
                affected_columns=working_headers,
                details=f"Removed {removed_duplicates} exact duplicate rows."
            ))

    # 4. String Trimming, Case Normalization, and Date Normalization
    if req.trim_whitespace or req.case_normalization in ("lower", "upper", "title") or req.standardize_text or req.normalize_dates:
        case_op = req.case_normalization
        for r in working_rows:
            for h in working_headers:
                v = r.get(h)
                if isinstance(v, str):
                    if req.trim_whitespace:
                        v = v.strip()
                    if case_op == "lower":
                        v = v.lower()
                    elif case_op == "upper":
                        v = v.upper()
                    elif case_op == "title":
                        v = v.title()

                    if req.standardize_text:
                        if v.lower() in ("true", "yes", "y", "t"):
                            v = "True"
                        elif v.lower() in ("false", "no", "n", "f"):
                            v = "False"

                    if req.normalize_dates and any(char in v for char in ("-", "/")) and any(c.isdigit() for c in v):
                        parsed_d = parse_date_safely(v)
                        if parsed_d:
                            v = parsed_d
                    r[h] = v

    # 5. Type Casting
    if req.type_casts:
        for cast in req.type_casts:
            col = cast.column
            if col not in working_headers:
                continue
            target_t = cast.target_type
            for r in working_rows:
                v = r.get(col)
                if v is not None and v != "" and v != "N/A":
                    try:
                        if target_t == "numeric":
                            r[col] = float(str(v).replace("$", "").replace(",", "").strip())
                        elif target_t == "string":
                            r[col] = str(v)
                        elif target_t == "boolean":
                            r[col] = str(v).lower() in ("true", "1", "yes", "t")
                        elif target_t == "date":
                            r[col] = parse_date_safely(v) or v
                    except Exception:
                        pass
        changes_summary.append(f"Applied data-type casts to {len(req.type_casts)} columns.")

    # 6. Column Statistical Distributions for Imputation & Outlier Fences
    col_num_vals: Dict[str, List[float]] = {}
    col_str_vals: Dict[str, List[str]] = {}

    for h in working_headers:
        col_num_vals[h] = []
        col_str_vals[h] = []
        for r in working_rows:
            v = r.get(h)
            if v != "" and v is not None and v != "N/A" and str(v).lower() != "nan":
                if isinstance(v, (int, float)):
                    col_num_vals[h].append(float(v))
                else:
                    col_str_vals[h].append(str(v))

    impute_targets: Dict[str, Any] = {}
    col_means: Dict[str, float] = {}
    col_stds: Dict[str, float] = {}

    for h in working_headers:
        nums = col_num_vals[h]
        strs = col_str_vals[h]

        if len(nums) >= len(strs) and len(nums) > 0:
            # Numeric feature
            m = sum(nums) / len(nums)
            col_means[h] = m
            if len(nums) > 1:
                var = sum((x - m) ** 2 for x in nums) / len(nums)
                col_stds[h] = math.sqrt(var)
            else:
                col_stds[h] = 0.0

            if req.impute_numeric == "mean":
                impute_targets[h] = round(m, 2)
            elif req.impute_numeric == "median":
                impute_targets[h] = round(statistics.median(nums), 2)
            elif req.impute_numeric == "zero":
                impute_targets[h] = 0.0
        else:
            # Categorical feature
            if strs and req.impute_categorical == "mode":
                try:
                    impute_targets[h] = statistics.mode(strs)
                except Exception:
                    impute_targets[h] = strs[0]
            elif req.impute_categorical == "placeholder":
                impute_targets[h] = req.custom_null_placeholder or "Unknown"

    # 7. Apply Imputation and Outlier Actions
    imputed_nulls = 0
    handled_outliers = 0
    final_rows: List[Dict[str, Any]] = []

    for r in working_rows:
        drop_row = False
        new_r: Dict[str, Any] = {}

        for h in working_headers:
            v = r.get(h)
            is_empty = v == "" or v is None or v == "N/A" or str(v).lower() == "nan"

            if is_empty:
                if req.impute_numeric == "drop" and h in col_num_vals and len(col_num_vals[h]) > 0:
                    drop_row = True
                    break
                elif req.impute_categorical == "drop" and h in col_str_vals and len(col_str_vals[h]) > 0:
                    drop_row = True
                    break
                elif h in impute_targets:
                    new_r[h] = impute_targets[h]
                    imputed_nulls += 1
                else:
                    new_r[h] = ""
            else:
                # Check Outlier if numeric
                if h in col_means and col_stds.get(h, 0) > 0 and isinstance(v, (int, float)):
                    z = abs((v - col_means[h]) / col_stds[h])
                    if z > 3.0:
                        if req.outlier_handling == "drop":
                            drop_row = True
                            handled_outliers += 1
                            break
                        elif req.outlier_handling == "clip":
                            sign = 1 if v >= col_means[h] else -1
                            v = round(col_means[h] + sign * 3.0 * col_stds[h], 2)
                            handled_outliers += 1
                new_r[h] = v

        if not drop_row:
            final_rows.append(new_r)

    if imputed_nulls > 0:
        changes_summary.append(f"Imputed {imputed_nulls} missing data values.")
        logs.append(CleanOperationLog(
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            operation="impute_missing",
            affected_rows=imputed_nulls,
            affected_columns=list(impute_targets.keys()),
            details=f"Imputed missing cells: numeric={req.impute_numeric}, categorical={req.impute_categorical}"
        ))

    if handled_outliers > 0:
        changes_summary.append(f"Handled {handled_outliers} statistical outliers using '{req.outlier_handling}'.")
        logs.append(CleanOperationLog(
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            operation="handle_outliers",
            affected_rows=handled_outliers,
            affected_columns=[h for h in working_headers if h in col_means],
            details=f"Outlier action: {req.outlier_handling}"
        ))

    preview = CleanPreviewResponse(
        original_row_count=original_row_count,
        cleaned_row_count=len(final_rows),
        removed_duplicates=removed_duplicates,
        imputed_nulls=imputed_nulls,
        handled_outliers=handled_outliers,
        preview_columns=working_headers,
        preview_original_rows=rows[:8],
        preview_cleaned_rows=final_rows[:8],
        changes_summary=changes_summary if changes_summary else ["Dataset was already clean. No modifications needed."],
    )

    return working_headers, final_rows, preview, logs


def rows_to_csv_bytes(headers: List[str], rows: List[Dict[str, Any]]) -> bytes:
    """Serialize list of row dicts into standard UTF-8 encoded CSV bytes."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for r in rows:
        writer.writerow([r.get(h, "") for h in headers])
    return output.getvalue().encode("utf-8")
