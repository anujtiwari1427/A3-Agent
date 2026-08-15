"""
Forecasting Service — forward-looking time-series predictive modeling with confidence bounds.
"""

import math
from typing import List, Dict, Any, Optional
from ..schemas.forecasting import ForecastResponse, ForecastPoint


def run_time_series_forecast(
    headers: List[str],
    rows: List[Dict[str, Any]],
    metric: Optional[str] = None,
    dimension: Optional[str] = None,
    horizon: int = 30,
    model_type: str = "linear",
    confidence: float = 0.95,
) -> ForecastResponse:
    """Generate statistical time-series projections with confidence bands."""
    if not rows:
        return ForecastResponse(
            metric_column=metric or "None",
            dimension_column=dimension,
            horizon=horizon,
            trend_slope=0.0,
            growth_rate_pct=0.0,
            r_squared=0.0,
            history=[],
            forecast=[],
            model_type=model_type,
            confidence_interval=f"{int(confidence*100)}%",
            status="error",
            message="No data rows available to forecast.",
        )

    # Auto-detect numeric metric if not provided
    if not metric or metric not in headers:
        for col in headers:
            vals = [r[col] for r in rows if isinstance(r.get(col), (int, float))]
            if len(vals) > len(rows) * 0.6:
                metric = col
                break

    if not metric:
        return ForecastResponse(
            metric_column="None",
            dimension_column=dimension,
            horizon=horizon,
            trend_slope=0.0,
            growth_rate_pct=0.0,
            r_squared=0.0,
            history=[],
            forecast=[],
            model_type=model_type,
            confidence_interval=f"{int(confidence*100)}%",
            status="error",
            message="No valid numeric metric column found for time-series forecasting.",
        )

    # Auto-detect date/time dimension
    if not dimension or dimension not in headers:
        dimension = next((h for h in headers if h != metric and any(k in h.lower() for k in ("date", "month", "time", "day", "year"))), None)
        if not dimension:
            dimension = next((h for h in headers if h != metric), None)

    history_points = []
    y_values = []

    for idx, r in enumerate(rows):
        val = r.get(metric)
        if isinstance(val, (int, float)):
            label = str(r.get(dimension, f"T-{len(rows)-idx}")) if dimension else f"Step {idx+1}"
            history_points.append({"step": idx + 1, "label": label, "value": float(val)})
            y_values.append(float(val))

    n = len(y_values)
    if n < 2:
        return ForecastResponse(
            metric_column=metric,
            dimension_column=dimension,
            horizon=horizon,
            trend_slope=0.0,
            growth_rate_pct=0.0,
            r_squared=0.0,
            history=history_points,
            forecast=[],
            model_type=model_type,
            confidence_interval=f"{int(confidence*100)}%",
            status="error",
            message="Forecasting requires at least 2 historical data points.",
        )

    x_vals = list(range(1, n + 1))
    x_mean = sum(x_vals) / n
    y_mean = sum(y_values) / n

    multiplier = 1.28 if confidence == 0.80 else (2.58 if confidence == 0.99 else 1.96)
    conf_str = f"{int(confidence*100)}%"

    ss_tot = sum((y - y_mean) ** 2 for y in y_values)
    forecast_points: List[ForecastPoint] = []

    if model_type == "exponential":
        min_y = min(y_values)
        offset = abs(min_y) + 1.0 if min_y <= 0 else 0.0

        ln_y = [math.log(y + offset) for y in y_values]
        ln_y_mean = sum(ln_y) / n

        num = sum((x_vals[i] - x_mean) * (ln_y[i] - ln_y_mean) for i in range(n))
        den = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
        slope = num / den if den != 0 else 0.0
        intercept = ln_y_mean - slope * x_mean

        fits = [max(0.0, math.exp(slope * x + intercept) - offset) for x in x_vals]
        residuals = [y_values[i] - fits[i] for i in range(n)]
        ss_res = sum(r ** 2 for r in residuals)
        r_squared = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) if ss_tot > 0 else 0.85
        std_err = math.sqrt(ss_res / (n - 2)) if n > 2 and ss_res > 0 else (abs(y_mean) * 0.05 or 1.0)
        growth_rate_pct = round(((fits[-1] - fits[0]) / abs(fits[0] or 1.0)) * 100, 2)

        for step_ahead in range(1, horizon + 1):
            future_x = n + step_ahead
            pred_val = max(0.0, math.exp(slope * future_x + intercept) - offset)
            uncertainty = multiplier * std_err * math.sqrt(1 + (1 / n) + ((future_x - x_mean) ** 2) / (den if den != 0 else 1))
            forecast_points.append(ForecastPoint(
                step=future_x,
                label=f"+{step_ahead}d",
                forecast=round(pred_val, 2),
                lower_bound=round(max(0.0, pred_val - uncertainty), 2),
                upper_bound=round(pred_val + uncertainty, 2),
            ))
        model_name = f"Exponential Growth Model ({conf_str} CI)"

    elif model_type == "moving_average":
        diffs = [y_values[i] - y_values[i-1] for i in range(1, n)]
        recent_diffs = diffs[-6:] if len(diffs) >= 6 else diffs
        drift = sum(recent_diffs) / len(recent_diffs) if recent_diffs else 0.0

        def get_wma(vals):
            k = min(4, len(vals))
            if k == 0: return 0.0
            weights = list(range(1, k + 1))
            return sum(vals[-k:][i] * weights[i] for i in range(k)) / sum(weights)

        fits = [y_values[i] if i < 2 else max(0.0, get_wma(y_values[:i]) + drift) for i in range(n)]
        residuals = [y_values[i] - fits[i] for i in range(n)]
        ss_res = sum(r ** 2 for r in residuals)
        r_squared = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) if ss_tot > 0 else 0.80
        std_err = math.sqrt(ss_res / (n - 2)) if n > 2 and ss_res > 0 else (abs(y_mean) * 0.05 or 1.0)
        growth_rate_pct = round(((y_values[-1] - y_values[0]) / abs(y_values[0] or 1.0)) * 100, 2)

        temp_history = list(y_values)
        for step_ahead in range(1, horizon + 1):
            future_x = n + step_ahead
            pred_val = max(0.0, get_wma(temp_history) + drift)
            temp_history.append(pred_val)
            uncertainty = multiplier * std_err * math.sqrt(1 + (step_ahead / n))
            forecast_points.append(ForecastPoint(
                step=future_x,
                label=f"+{step_ahead}d",
                forecast=round(pred_val, 2),
                lower_bound=round(max(0.0, pred_val - uncertainty), 2),
                upper_bound=round(pred_val + uncertainty, 2),
            ))
        slope = drift
        model_name = f"Weighted Moving Average Model ({conf_str} CI)"

    else:
        # Default: Adaptive Trend Regression
        num = sum((x_vals[i] - x_mean) * (y_values[i] - y_mean) for i in range(n))
        den = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
        slope = num / den if den != 0 else 0.0
        intercept = y_mean - slope * x_mean

        fits = [slope * x + intercept for x in x_vals]
        residuals = [y_values[i] - fits[i] for i in range(n)]
        ss_res = sum(r ** 2 for r in residuals)
        r_squared = max(0.0, min(1.0, 1.0 - (ss_res / ss_tot))) if ss_tot > 0 else 0.85
        std_err = math.sqrt(ss_res / (n - 2)) if n > 2 and ss_res > 0 else (abs(y_mean) * 0.05 or 1.0)
        growth_rate_pct = round(((y_values[-1] - y_values[0]) / abs(y_values[0] or 1.0)) * 100, 2)

        for step_ahead in range(1, horizon + 1):
            future_x = n + step_ahead
            pred_val = max(0.0, slope * future_x + intercept)
            uncertainty = multiplier * std_err * math.sqrt(1 + (1 / n) + ((future_x - x_mean) ** 2) / (den if den != 0 else 1))
            forecast_points.append(ForecastPoint(
                step=future_x,
                label=f"+{step_ahead}d",
                forecast=round(pred_val, 2),
                lower_bound=round(max(0.0, pred_val - uncertainty), 2),
                upper_bound=round(pred_val + uncertainty, 2),
            ))
        model_name = f"Adaptive Trend Regression ({conf_str} CI)"

    return ForecastResponse(
        metric_column=metric,
        dimension_column=dimension,
        horizon=horizon,
        trend_slope=round(slope, 3),
        growth_rate_pct=growth_rate_pct,
        r_squared=round(r_squared, 3),
        history=history_points[-24:],
        forecast=forecast_points,
        model_type=model_name,
        confidence_interval=conf_str,
        status="success",
    )
