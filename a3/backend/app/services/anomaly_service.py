"""
Anomaly Detection Service — statistical Z-score, IQR, and time-series outlier detection.
"""

import math
from typing import List, Dict, Any
from ..schemas.anomaly import AnomaliesResponse, AnomalyItem


def detect_anomalies(
    headers: List[str],
    rows: List[Dict[str, Any]],
    method: str = "z_score",
    threshold: float = 2.0,
) -> AnomaliesResponse:
    """Scan all numerical columns and detect anomalies using statistical techniques."""
    if not rows or not headers:
        return AnomaliesResponse(
            total_anomalies=0,
            anomaly_rate_pct=0.0,
            method=method,
            threshold=threshold,
            scanned_columns=[],
            anomalies=[],
        )

    anomalies: List[AnomalyItem] = []
    scanned_columns: List[str] = []
    total_data_points = 0

    for col in headers:
        values = [(idx, r[col], r) for idx, r in enumerate(rows) if isinstance(r.get(col), (int, float))]
        if len(values) < 4:
            continue

        scanned_columns.append(col)
        total_data_points += len(values)
        raw_vals = [float(v[1]) for v in values]

        if method == "iqr":
            # IQR Method
            sorted_v = sorted(raw_vals)
            n = len(sorted_v)
            q1 = sorted_v[int(n * 0.25)]
            q3 = sorted_v[int(n * 0.75)]
            iqr = q3 - q1
            mean_val = sum(raw_vals) / n

            if iqr > 0:
                lower_fence = q1 - threshold * iqr
                upper_fence = q3 + threshold * iqr
                for row_idx, val, full_row in values:
                    f_val = float(val)
                    if f_val < lower_fence or f_val > upper_fence:
                        deviation = abs(f_val - mean_val) / (iqr if iqr else 1.0)
                        severity = "critical" if deviation >= 3.0 else ("high" if deviation >= 2.0 else "mild")
                        anomalies.append(AnomalyItem(
                            row_index=row_idx + 1,
                            column=col,
                            value=f_val,
                            z_score=round(deviation, 2),
                            expected_mean=round(mean_val, 2),
                            method="iqr",
                            severity=severity,
                            context={k: full_row[k] for k in list(full_row.keys())[:5]},
                        ))
        else:
            # Standard Z-Score Method
            mean_val = sum(raw_vals) / len(raw_vals)
            variance = sum((x - mean_val) ** 2 for x in raw_vals) / len(raw_vals)
            std_dev = math.sqrt(variance)

            if std_dev > 0.0001:
                for row_idx, val, full_row in values:
                    f_val = float(val)
                    z = abs((f_val - mean_val) / std_dev)
                    if z >= threshold:
                        severity = "critical" if z >= 3.0 else ("high" if z >= 2.5 else "mild")
                        anomalies.append(AnomalyItem(
                            row_index=row_idx + 1,
                            column=col,
                            value=f_val,
                            z_score=round(z, 2),
                            expected_mean=round(mean_val, 2),
                            method="z_score",
                            severity=severity,
                            context={k: full_row[k] for k in list(full_row.keys())[:5]},
                        ))

    anomalies.sort(key=lambda a: a.z_score, reverse=True)
    rate = round(len(anomalies) / total_data_points * 100, 2) if total_data_points > 0 else 0.0

    return AnomaliesResponse(
        total_anomalies=len(anomalies),
        anomaly_rate_pct=rate,
        method=method,
        threshold=threshold,
        scanned_columns=scanned_columns,
        anomalies=anomalies[:60],
    )
