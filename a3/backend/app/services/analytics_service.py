"""
Analytics Service — Pearson & Spearman correlation matrices, linear regression analysis, group-by aggregations, and hypothesis testing.
"""

import math
from typing import List, Dict, Any, Tuple
from ..schemas.analytics import (
    CorrelationResponse,
    CorrelationPair,
    RegressionResponse,
    GroupByResponse,
    GroupByBucket,
    HypothesisTestResponse,
)


def _compute_ranks(vals: List[float]) -> List[float]:
    """Compute fractional ranks for Spearman rank correlation."""
    n = len(vals)
    indexed = sorted(enumerate(vals), key=lambda x: x[1])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j < n - 1 and indexed[j + 1][1] == indexed[j][1]:
            j += 1
        rank = (i + j + 2) / 2.0
        for k in range(i, j + 1):
            ranks[indexed[k][0]] = rank
        i = j + 1
    return ranks


def calculate_correlations(headers: List[str], rows: List[Dict[str, Any]]) -> CorrelationResponse:
    """Compute Pearson and Spearman rank correlation matrices for all numeric features."""
    numeric_cols = []
    for col in headers:
        vals = [r[col] for r in rows if isinstance(r.get(col), (int, float))]
        if len(vals) > len(rows) * 0.6:
            numeric_cols.append(col)

    if len(numeric_cols) < 2 or len(rows) < 2:
        return CorrelationResponse(columns=numeric_cols, matrix={}, top_correlations=[])

    matrix: Dict[str, Dict[str, float]] = {col: {} for col in numeric_cols}
    top_pairs: List[CorrelationPair] = []

    n = len(rows)
    stats: Dict[str, Dict[str, Any]] = {}

    for col in numeric_cols:
        vals = [float(r.get(col, 0) if isinstance(r.get(col), (int, float)) else 0) for r in rows]
        m = sum(vals) / n
        v = sum((x - m) ** 2 for x in vals) / n
        s = math.sqrt(v)
        ranks = _compute_ranks(vals)
        r_m = sum(ranks) / n
        r_v = sum((x - r_m) ** 2 for x in ranks) / n
        r_s = math.sqrt(r_v)
        stats[col] = {"mean": m, "std": s, "vals": vals, "ranks": ranks, "r_mean": r_m, "r_std": r_s}

    for i, col_a in enumerate(numeric_cols):
        matrix[col_a][col_a] = 1.0
        for j in range(i + 1, len(numeric_cols)):
            col_b = numeric_cols[j]
            s_a = stats[col_a]["std"]
            s_b = stats[col_b]["std"]
            m_a = stats[col_a]["mean"]
            m_b = stats[col_b]["mean"]
            v_a = stats[col_a]["vals"]
            v_b = stats[col_b]["vals"]

            if s_a > 0.0001 and s_b > 0.0001:
                cov = sum((v_a[k] - m_a) * (v_b[k] - m_b) for k in range(n)) / n
                pearson = max(-1.0, min(1.0, cov / (s_a * s_b)))
            else:
                pearson = 0.0

            # Spearman Rank Correlation
            r_sa = stats[col_a]["r_std"]
            r_sb = stats[col_b]["r_std"]
            r_ma = stats[col_a]["r_mean"]
            r_mb = stats[col_b]["r_mean"]
            rk_a = stats[col_a]["ranks"]
            rk_b = stats[col_b]["ranks"]

            if r_sa > 0.0001 and r_sb > 0.0001:
                r_cov = sum((rk_a[k] - r_ma) * (rk_b[k] - r_mb) for k in range(n)) / n
                spearman = max(-1.0, min(1.0, r_cov / (r_sa * r_sb)))
            else:
                spearman = 0.0

            r_pearson = round(pearson, 3)
            r_spearman = round(spearman, 3)
            matrix[col_a][col_b] = r_pearson
            matrix[col_b][col_a] = r_pearson

            if r_pearson >= 0.7:
                strength = "strong_positive"
            elif r_pearson >= 0.3:
                strength = "moderate_positive"
            elif r_pearson <= -0.7:
                strength = "strong_negative"
            elif r_pearson <= -0.3:
                strength = "moderate_negative"
            else:
                strength = "none"

            top_pairs.append(CorrelationPair(
                col_a=col_a,
                col_b=col_b,
                pearson=r_pearson,
                spearman=r_spearman,
                strength=strength
            ))

    top_pairs.sort(key=lambda p: abs(p.pearson), reverse=True)

    return CorrelationResponse(
        columns=numeric_cols,
        matrix=matrix,
        top_correlations=top_pairs[:12],
    )


def calculate_regression(
    headers: List[str],
    rows: List[Dict[str, Any]],
    feature_col: str,
    target_col: str
) -> RegressionResponse:
    """Compute bivariate Ordinary Least Squares linear regression with R² goodness-of-fit."""
    valid_points = []
    for r in rows:
        x = r.get(feature_col)
        y = r.get(target_col)
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            valid_points.append((float(x), float(y)))

    n = len(valid_points)
    if n < 2:
        return RegressionResponse(
            feature_column=feature_col,
            target_column=target_col,
            slope=0.0,
            intercept=0.0,
            r_squared=0.0,
            std_error=0.0,
            sample_points=[],
            equation=f"{target_col} = 0.00 * {feature_col} + 0.00"
        )

    x_vals = [p[0] for p in valid_points]
    y_vals = [p[1] for p in valid_points]

    x_mean = sum(x_vals) / n
    y_mean = sum(y_vals) / n

    num = sum((x_vals[i] - x_mean) * (y_vals[i] - y_mean) for i in range(n))
    den = sum((x_vals[i] - x_mean) ** 2 for i in range(n))

    slope = num / den if den != 0 else 0.0
    intercept = y_mean - slope * x_mean

    fits = [slope * x + intercept for x in x_vals]
    residuals = [y_vals[i] - fits[i] for i in range(n)]
    ss_res = sum(r ** 2 for r in residuals)
    ss_tot = sum((y - y_mean) ** 2 for y in y_vals)

    r_squared = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) if ss_tot > 0 else 0.0
    std_error = math.sqrt(ss_res / (n - 2)) if n > 2 and ss_res > 0 else 0.0

    sign = "+" if intercept >= 0 else "-"
    eq = f"{target_col} = {slope:.3f} × {feature_col} {sign} {abs(intercept):.2f} (R² = {r_squared:.3f})"

    sampled = [{"x": p[0], "y": p[1], "fitted": round(slope * p[0] + intercept, 2)} for p in valid_points[:40]]

    return RegressionResponse(
        feature_column=feature_col,
        target_column=target_col,
        slope=round(slope, 4),
        intercept=round(intercept, 4),
        r_squared=round(r_squared, 4),
        std_error=round(std_error, 4),
        sample_points=sampled,
        equation=eq
    )


def calculate_group_by(
    headers: List[str],
    rows: List[Dict[str, Any]],
    group_col: str,
    metric_cols: List[str]
) -> GroupByResponse:
    """Group rows by a categorical dimension and compute sums, averages, min, max, and counts."""
    groups: Dict[str, Dict[str, List[float]]] = {}

    for r in rows:
        key = str(r.get(group_col, "Unknown") or "Unknown").strip()
        if key not in groups:
            groups[key] = {m: [] for m in metric_cols}

        for m in metric_cols:
            v = r.get(m)
            if isinstance(v, (int, float)):
                groups[key][m].append(float(v))

    buckets: List[GroupByBucket] = []
    for key, metrics in groups.items():
        aggregates: Dict[str, float] = {}
        count = max(len(vals) for vals in metrics.values()) if metrics else 0
        for m, vals in metrics.items():
            aggregates[f"{m}_sum"] = round(sum(vals), 2)
            aggregates[f"{m}_avg"] = round(sum(vals) / len(vals), 2) if vals else 0.0
            aggregates[f"{m}_min"] = round(min(vals), 2) if vals else 0.0
            aggregates[f"{m}_max"] = round(max(vals), 2) if vals else 0.0

        buckets.append(GroupByBucket(group_key=key, count=count, aggregates=aggregates))

    buckets.sort(key=lambda b: b.count, reverse=True)

    return GroupByResponse(
        group_column=group_col,
        metric_columns=metric_cols,
        buckets=buckets[:25]
    )


def calculate_hypothesis_test(
    headers: List[str],
    rows: List[Dict[str, Any]],
    group_col: str,
    seg_a: str,
    seg_b: str,
    metric_col: str,
    conf_level: float = 0.95
) -> HypothesisTestResponse:
    """Perform two-sample Welch's t-test comparing two categorical segments on a continuous metric."""
    vals_a = [float(r[metric_col]) for r in rows if str(r.get(group_col, "")).strip().lower() == seg_a.strip().lower() and isinstance(r.get(metric_col), (int, float))]
    vals_b = [float(r[metric_col]) for r in rows if str(r.get(group_col, "")).strip().lower() == seg_b.strip().lower() and isinstance(r.get(metric_col), (int, float))]

    n_a = len(vals_a)
    n_b = len(vals_b)

    if n_a < 2 or n_b < 2:
        return HypothesisTestResponse(
            group_column=group_col,
            segment_a=seg_a,
            segment_b=seg_b,
            metric_column=metric_col,
            mean_a=round(sum(vals_a) / n_a, 2) if n_a > 0 else 0.0,
            mean_b=round(sum(vals_b) / n_b, 2) if n_b > 0 else 0.0,
            std_a=0.0,
            std_b=0.0,
            count_a=n_a,
            count_b=n_b,
            mean_difference=0.0,
            ci_lower=0.0,
            ci_upper=0.0,
            confidence_level=conf_level,
            t_statistic=0.0,
            p_value=1.0,
            is_significant=False,
            conclusion="Insufficient sample size in one or both segments for valid hypothesis testing (requires n ≥ 2 each)."
        )

    mean_a = sum(vals_a) / n_a
    mean_b = sum(vals_b) / n_b
    var_a = sum((x - mean_a) ** 2 for x in vals_a) / (n_a - 1)
    var_b = sum((x - mean_b) ** 2 for x in vals_b) / (n_b - 1)
    std_a = math.sqrt(var_a)
    std_b = math.sqrt(var_b)

    mean_diff = mean_a - mean_b
    se_diff = math.sqrt((var_a / n_a) + (var_b / n_b)) if (var_a / n_a) + (var_b / n_b) > 0 else 0.0001
    t_stat = mean_diff / se_diff if se_diff > 0 else 0.0

    z_crit = 1.96 if conf_level == 0.95 else 2.576 if conf_level >= 0.99 else 1.645
    ci_lower = mean_diff - z_crit * se_diff
    ci_upper = mean_diff + z_crit * se_diff

    # Standard normal CDF approximation for p-value
    abs_t = abs(t_stat)
    p_approx = 2.0 * (1.0 / (1.0 + math.exp(0.07056 * (abs_t ** 3) + 1.5976 * abs_t)))
    p_approx = max(0.0001, min(1.0, p_approx))
    is_sig = p_approx < (1.0 - conf_level)

    if is_sig:
        concl = f"Statistically significant difference detected (p = {p_approx:.4f} < {1.0 - conf_level:.2f}). Segment '{seg_a}' differs significantly from '{seg_b}'."
    else:
        concl = f"No statistically significant difference detected (p = {p_approx:.4f} ≥ {1.0 - conf_level:.2f}). Observed difference may be due to random variation."

    return HypothesisTestResponse(
        group_column=group_col,
        segment_a=seg_a,
        segment_b=seg_b,
        metric_column=metric_col,
        mean_a=round(mean_a, 2),
        mean_b=round(mean_b, 2),
        std_a=round(std_a, 2),
        std_b=round(std_b, 2),
        count_a=n_a,
        count_b=n_b,
        mean_difference=round(mean_diff, 2),
        ci_lower=round(ci_lower, 2),
        ci_upper=round(ci_upper, 2),
        confidence_level=conf_level,
        t_statistic=round(t_stat, 3),
        p_value=round(p_approx, 4),
        is_significant=is_sig,
        conclusion=concl,
    )
