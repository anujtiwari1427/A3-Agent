"""
AI Copilot Service — controlled natural language data reasoning, intent routing, and structured analytical responses.
"""

import time
import math
from typing import List, Dict, Any, Optional
from ..schemas.ai import AIChatRequest, AIChatResponse, AIInsightItem
from .profiling_service import generate_full_analytics
from .anomaly_service import detect_anomalies
from .analytics_service import calculate_correlations


def process_copilot_query(
    headers: List[str],
    rows: List[Dict[str, Any]],
    dataset_name: str,
    req: AIChatRequest
) -> AIChatResponse:
    """Classify user question intent, compute mathematical ground-truth from dataset, and return structured insights."""
    start_time = time.time()
    query = req.message.lower().strip()

    # Pre-extract numerical columns
    num_cols = []
    col_stats: Dict[str, Dict[str, float]] = {}
    for h in headers:
        vals = [float(r[h]) for r in rows if isinstance(r.get(h), (int, float))]
        if len(vals) > len(rows) * 0.6 and len(vals) > 0:
            num_cols.append(h)
            m = sum(vals) / len(vals)
            v = sum((x - m) ** 2 for x in vals) / len(vals)
            col_stats[h] = {
                "mean": m,
                "std": math.sqrt(v),
                "min": min(vals),
                "max": max(vals),
                "total": sum(vals),
                "count": len(vals)
            }

    insights: List[AIInsightItem] = []
    intent = "general"
    suggested_view = None
    suggested_action = None
    plot_data = None

    # 1. Cleaning Intent
    if any(k in query for k in ("clean", "missing", "impute", "null", "duplicate", "fix")):
        intent = "cleaning"
        suggested_view = "cleaning"
        suggested_action = "Open Data Cleaning Studio"
        
        # Calculate nulls
        total_cells = len(headers) * len(rows) if rows else 1
        null_cells = sum(1 for r in rows for h in headers if r.get(h) == "" or r.get(h) is None or r.get(h) == "N/A")
        
        insights.append(AIInsightItem(
            category="FACT",
            title="Missing Cell Distribution",
            detail=f"{null_cells} of {total_cells} data cells ({round(null_cells/total_cells*100, 1)}%) are currently empty or unpopulated.",
            confidence=1.0,
            metric_reference="Completeness"
        ))
        insights.append(AIInsightItem(
            category="RECOMMENDATION",
            title="Recommended Imputation Strategy",
            detail="Execute non-destructive imputation: Mean/Median strategy for continuous metrics and Mode strategy for categorical attributes.",
            confidence=0.95,
        ))
        reply = (
            f"I have inspected the completeness of **{dataset_name}**. "
            f"Currently, {null_cells} cells are missing. "
            f"You can use the **Cleaning Studio** to non-destructively impute these values and drop duplicate rows while keeping your original raw file intact."
        )

    # 2. Anomaly Intent
    elif any(k in query for k in ("anomaly", "anomalies", "outlier", "unusual", "spike", "deviation")):
        intent = "anomaly"
        suggested_view = "anomalies"
        suggested_action = "Review Anomaly Scanner"
        
        scan_res = detect_anomalies(headers, rows, threshold=2.5)
        count = scan_res.total_anomalies

        insights.append(AIInsightItem(
            category="FACT",
            title="Statistical Outliers Detected",
            detail=f"{count} points exceeded 2.5 standard deviations from their expected attribute means.",
            confidence=0.99,
        ))
        if scan_res.anomalies:
            top_a = scan_res.anomalies[0]
            insights.append(AIInsightItem(
                category="OBSERVATION",
                title=f"Highest Outlier in {top_a.column}",
                detail=f"Row #{top_a.row_index} registered value {top_a.value:,.2f} with a Z-Score of {top_a.z_score} (Expected Mean: {top_a.expected_mean:,.2f}).",
                confidence=0.95,
            ))
            insights.append(AIInsightItem(
                category="RECOMMENDATION",
                title="Outlier Treatment",
                detail="Consider whether these extremes represent true peak performance or data collection artifacts before training predictive models.",
                confidence=0.90,
            ))
        reply = (
            f"Statistical scan across all numerical features in **{dataset_name}** detected **{count} significant anomalies** (Z-Score > 2.5). "
            f"You can inspect each affected row and its context in the **Anomaly Detection** workspace."
        )

    # 3. Forecast Intent
    elif any(k in query for k in ("forecast", "predict", "trend", "future", "projection", "horizon")):
        intent = "forecast"
        suggested_view = "forecasting"
        suggested_action = "Configure Predictive Horizon"

        target = num_cols[0] if num_cols else "Metric"
        if target in col_stats:
            insights.append(AIInsightItem(
                category="FACT",
                title=f"Historical Baseline for {target}",
                detail=f"Historical mean value is {col_stats[target]['mean']:,.2f} with a standard deviation of {col_stats[target]['std']:,.2f}.",
                confidence=1.0,
                metric_reference=target
            ))
        insights.append(AIInsightItem(
            category="OBSERVATION",
            title="Predictive Methodology",
            detail="Time-series adaptive regression and exponential smoothing with 95% confidence intervals are ready for projection.",
            confidence=0.95,
        ))
        insights.append(AIInsightItem(
            category="RECOMMENDATION",
            title="Optimal Horizon Range",
            detail="For current historical length, a 30-day to 90-day forecast horizon provides optimal confidence boundaries.",
            confidence=0.90,
        ))
        reply = (
            f"Predictive models are prepared for **{dataset_name}**. "
            f"You can project targets across 7d, 30d, 90d, or 365d horizons with confidence bands in the **Forecasting Studio**."
        )

    # 4. Correlation Intent
    elif any(k in query for k in ("correlation", "relationship", "relation", "dependency", "matrix")):
        intent = "correlation"
        suggested_view = "analytics"
        suggested_action = "View Correlation Heatmap"

        corr_res = calculate_correlations(headers, rows)
        if corr_res.top_correlations:
            top_c = corr_res.top_correlations[0]
            insights.append(AIInsightItem(
                category="FACT",
                title=f"Strongest Variable Pair",
                detail=f"Linear correlation between `{top_c.col_a}` and `{top_c.col_b}` is r = {top_c.pearson:.3f} ({top_c.strength.replace('_', ' ')}).",
                confidence=1.0,
            ))
            insights.append(AIInsightItem(
                category="OBSERVATION",
                title="Linear Coupling",
                detail=f"A change in `{top_c.col_a}` typically corresponds with a proportional variance in `{top_c.col_b}`.",
                confidence=0.92,
            ))
        reply = (
            f"Evaluated multi-column Pearson correlation matrix for **{dataset_name}**. "
            f"Found {len(corr_res.top_correlations)} meaningful numerical feature pairings."
        )

    # 5. Summary / Profile Intent
    elif any(k in query for k in ("summary", "overview", "profile", "describe", "stats", "kpi", "what is this")):
        intent = "summary"
        suggested_view = "profile"
        suggested_action = "Open Data Profile"

        insights.append(AIInsightItem(
            category="FACT",
            title="Dataset Dimensions",
            detail=f"{len(rows):,} records and {len(headers)} columns ({len(num_cols)} numeric, {len(headers)-len(num_cols)} categorical/date).",
            confidence=1.0,
        ))
        if num_cols:
            first_m = num_cols[0]
            insights.append(AIInsightItem(
                category="OBSERVATION",
                title=f"Primary Metric Scale: {first_m}",
                detail=f"Mean: {col_stats[first_m]['mean']:,.2f} | Min: {col_stats[first_m]['min']:,.2f} | Max: {col_stats[first_m]['max']:,.2f}.",
                confidence=1.0,
                metric_reference=first_m
            ))
        insights.append(AIInsightItem(
            category="RECOMMENDATION",
            title="Next Step Exploration",
            detail="Explore the Graph Studio to build segment breakdowns or run Anomaly Detection to inspect outliers.",
            confidence=0.90,
        ))
        reply = (
            f"Here is the executive summary for **{dataset_name}**:\n"
            f"• **Records**: {len(rows):,}\n"
            f"• **Attributes**: {len(headers)} ({len(num_cols)} numerical features)\n"
            f"• **Numerical Metrics**: {', '.join(num_cols[:4])}"
        )

    # 6. Chart / Visualization Intent
    elif any(k in query for k in ("plot", "chart", "graph", "visualize", "show me")):
        intent = "chart"
        suggested_view = "graph-studio"
        suggested_action = "Open Graph Studio"

        if num_cols:
            target_metric = num_cols[0]
            dim_col = next((h for h in headers if h != target_metric), headers[0])
            sample_pts = rows[:12]
            plot_data = {
                "labels": [str(r.get(dim_col, f"#{i+1}")) for i, r in enumerate(sample_pts)],
                "values": [float(r.get(target_metric, 0)) for r in sample_pts],
                "metric": target_metric
            }
            insights.append(AIInsightItem(
                category="FACT",
                title=f"Plotted {target_metric}",
                detail=f"Visualized first 12 data points grouped by `{dim_col}`.",
                confidence=1.0,
            ))
        reply = f"Generated interactive chart preview for `{dataset_name}`. You can customize axes, colors, and aggregations in the **Graph Studio**."

    # 7. General Inquiry
    else:
        intent = "general"
        reply = (
            f"I am your local AI Analytics Copilot for **{dataset_name}**.\n\n"
            f"You can ask me to:\n"
            f"• **'Summarize this dataset'** to view key KPIs and geometry\n"
            f"• **'Check for missing values'** to audit data cleanliness\n"
            f"• **'Find unusual values'** to detect statistical outliers\n"
            f"• **'What are the strongest correlations?'** to analyze dependencies\n"
            f"• **'Forecast revenue'** to compute forward projections\n"
            f"• **'Plot monthly trend'** to render interactive charts"
        )

    elapsed = int((time.time() - start_time) * 1000)

    return AIChatResponse(
        reply=reply,
        intent=intent,
        suggested_action=suggested_action,
        suggested_view=suggested_view,
        insights=insights,
        plot_data=plot_data,
        execution_time_ms=elapsed
    )
