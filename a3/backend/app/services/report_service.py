"""
Report Service — executive report compilation, Markdown synthesis, and structured JSON export.
"""

import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session as DBSession

from ..models.domain import Report, Dataset
from ..schemas.report import ReportGenerateRequest, ReportResponse, ReportSection
from .profiling_service import generate_full_analytics
from .anomaly_service import detect_anomalies
from .analytics_service import calculate_correlations
from .forecasting_service import run_time_series_forecast


def build_executive_report(
    headers: List[str],
    rows: List[Dict[str, Any]],
    dataset: Dataset,
    req: ReportGenerateRequest,
    db: DBSession,
    user_id: Optional[str] = None,
) -> ReportResponse:
    """Compile comprehensive executive strategic briefing."""
    analytics = generate_full_analytics(headers, rows)
    anomalies = detect_anomalies(headers, rows, threshold=2.5) if req.include_anomalies else None
    correlations = calculate_correlations(headers, rows) if req.include_correlations else None
    forecast = run_time_series_forecast(headers, rows, horizon=req.forecast_horizon) if req.include_forecast else None

    report_id = str(uuid.uuid4())
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%B %d, %Y - %H:%M UTC")
    title = req.title or f"Executive Strategic Briefing: {dataset.name}"

    sections: List[ReportSection] = []

    # 1. Dataset Overview & Data Quality
    quality_score = analytics.quality_profile.overall_score
    sections.append(ReportSection(
        heading="1. Data Geometry & Quality Health Score",
        content=(
            f"The analyzed dataset contains **{len(rows):,} records** across **{len(headers)} attributes**. "
            f"The computed Data Quality Score is **{quality_score}/100**, indicating "
            f"{'pristine' if quality_score > 90 else ('acceptable' if quality_score > 70 else 'degraded')} data readiness."
        ),
        highlights=[
            f"Completeness Index: {analytics.quality_profile.completeness_score}%",
            f"Uniqueness Score: {analytics.quality_profile.uniqueness_score}%",
            f"Validity Score: {analytics.quality_profile.validity_score}%",
        ] + analytics.quality_profile.warnings[:3]
    ))

    # 2. Key Performance Indicators
    num_cols = [c for c, s in analytics.summary.items() if s.mean is not None]
    if req.include_kpis and num_cols:
        kpi_highlights = []
        for col in num_cols[:4]:
            s = analytics.summary[col]
            kpi_highlights.append(f"{col}: Mean = {s.mean:,.2f} | Median = {s.median:,.2f} | StdDev = {s.std_dev:,.2f} | Range = [{s.min:,.2f} to {s.max:,.2f}]")

        sections.append(ReportSection(
            heading="2. Core Numerical Distributions & KPIs",
            content="Summary metrics across primary quantitative dimensions:",
            highlights=kpi_highlights
        ))

    # 3. Correlations
    if correlations and correlations.top_correlations:
        corr_highlights = [
            f"**{c.col_a}** & **{c.col_b}**: r = {c.pearson:.3f} ({c.strength.replace('_', ' ')})"
            for c in correlations.top_correlations[:4]
        ]
        sections.append(ReportSection(
            heading="3. Key Variable Couplings & Correlations",
            content="Empirical Pearson correlation coefficients between numerical attributes:",
            highlights=corr_highlights
        ))

    # 4. Anomalies
    if anomalies:
        anomaly_content = f"Statistical outlier scan identified **{anomalies.total_anomalies} significant anomalies** ({anomalies.anomaly_rate_pct}% deviation rate)."
        anomaly_highlights = [
            f"Row #{a.row_index} in `{a.column}`: Value = {a.value:,.2f} (Z-Score = {a.z_score}, Severity = {a.severity.upper()})"
            for a in anomalies.anomalies[:4]
        ]
        sections.append(ReportSection(
            heading="4. Risk & Anomaly Diagnostics",
            content=anomaly_content,
            highlights=anomaly_highlights if anomaly_highlights else ["No critical outliers detected exceeding 2.5 standard deviations."]
        ))

    # 5. Forecast
    if forecast and forecast.status == "success":
        forecast_content = (
            f"Predictive projection for `{forecast.metric_column}` using **{forecast.model_type}** "
            f"over a **{forecast.horizon}-period horizon** (Confidence Level: {forecast.confidence_interval})."
        )
        first_f = forecast.forecast[0] if forecast.forecast else None
        last_f = forecast.forecast[-1] if forecast.forecast else None
        f_highlights = [
            f"Growth Rate Projection: {forecast.growth_rate_pct:+.2f}%",
            f"Model Goodness of Fit (R²): {forecast.r_squared:.3f}",
        ]
        if first_f and last_f:
            f_highlights.append(f"Immediate Target ({first_f.label}): {first_f.forecast:,.2f} [Range: {first_f.lower_bound:,.2f} - {first_f.upper_bound:,.2f}]")
            f_highlights.append(f"Horizon Target ({last_f.label}): {last_f.forecast:,.2f} [Range: {last_f.lower_bound:,.2f} - {last_f.upper_bound:,.2f}]")

        sections.append(ReportSection(
            heading="5. Predictive Time-Series Outlook",
            content=forecast_content,
            highlights=f_highlights
        ))

    # 6. Strategic Recommendations
    sections.append(ReportSection(
        heading="6. Strategic Recommendations & Action Plan",
        content="Actionable takeaways based on empirical dataset findings:",
        highlights=[
            "Maintain continuous data profiling to mitigate missingness spikes.",
            "Establish alert thresholds around flagged outlier boundaries.",
            "Incorporate high-correlation driver variables into forward financial and operational plans.",
            "Review What-If sensitivity scenarios prior to major operational adjustments."
        ]
    ))

    # Assemble Markdown string
    md_lines = [
        f"# {title}",
        f"**Generated:** {now_str} | **Dataset:** `{dataset.name}` | **Quality Score:** {quality_score}/100",
        "",
        "---",
        "",
        "## Executive Summary",
        (
            f"This automated briefing provides an empirical overview of `{dataset.name}`, encompassing "
            f"{len(rows):,} records and {len(headers)} attributes. Data quality is scored at {quality_score}/100. "
            f"Key metrics, statistical anomalies, linear correlations, and predictive outlooks have been analyzed below."
        ),
        ""
    ]

    for sec in sections:
        md_lines.append(f"## {sec.heading}")
        md_lines.append(sec.content)
        md_lines.append("")
        for h in sec.highlights:
            md_lines.append(f"- {h}")
        md_lines.append("")

    full_markdown = "\n".join(md_lines)

    # Save to database if user context is available
    report_record = Report(
        id=report_id,
        org_id=dataset.org_id,
        dataset_id=dataset.id,
        created_by=user_id,
        title=title,
        summary=f"Automated Strategic Briefing for {dataset.name} (Quality: {quality_score}/100)",
        content_markdown=full_markdown,
        content_json=str({
            "quality_score": quality_score,
            "total_records": len(rows),
            "total_columns": len(headers),
        })
    )
    db.add(report_record)
    db.commit()

    return ReportResponse(
        id=report_id,
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        title=title,
        generated_at=now_str,
        data_quality_score=quality_score,
        total_records=len(rows),
        total_columns=len(headers),
        executive_summary=f"Automated strategic analysis of {dataset.name} ({len(rows):,} records, {len(headers)} columns).",
        sections=sections,
        markdown_content=full_markdown,
        json_structure={
            "id": report_id,
            "title": title,
            "generated_at": now_str,
            "quality_score": quality_score,
            "records": len(rows),
            "columns": len(headers),
            "sections": [s.model_dump() for s in sections]
        }
    )
