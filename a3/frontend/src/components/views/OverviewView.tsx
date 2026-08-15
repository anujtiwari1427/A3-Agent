"use client";

import React from "react";
import { AnalyticsData, DatasetInfo, ViewType } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LineAreaChart } from "../charts/LineAreaChart";
import { DonutChart } from "../charts/DonutChart";

interface OverviewViewProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
  loading: boolean;
  onNavigate: (view: ViewType) => void;
  onLoadSample: (type: string) => void;
}

export function OverviewView({
  dataset,
  analytics,
  loading,
  onNavigate,
  onLoadSample,
}: OverviewViewProps) {
  if (!dataset) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-purple-500/10 border border-white/10 text-center max-w-2xl mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-3xl text-black font-bold mx-auto mb-4 shadow-xl">
            ◈
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to A3 Data Intelligence</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
            Your local-first intelligence workspace for statistical profiling, non-destructive cleaning, time-series forecasting, and AI-powered insights.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => onLoadSample("ecommerce")}>
              🛒 Load E-Commerce Sample
            </Button>
            <Button variant="secondary" onClick={() => onLoadSample("saas")}>
              📈 Load SaaS MRR Sample
            </Button>
            <Button variant="secondary" onClick={() => onLoadSample("fintech")}>
              💳 Load FinTech Sample
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const qualityScore = analytics?.quality_profile?.overall_score ?? dataset.health_score;
  const numCols = analytics?.columns?.filter((c) => c.type === "numeric") ?? [];
  const primaryMetric = numCols.length > 0 ? numCols[0].name : null;
  const primaryStats = primaryMetric && analytics?.summary ? analytics.summary[primaryMetric] : null;

  // Extract top categorical breakdown for quick donut chart
  const strCols = analytics?.columns?.filter((c) => c.type === "string") ?? [];
  const primaryCat = strCols.length > 0 ? strCols[0].name : null;
  const donutData =
    primaryCat && analytics?.summary?.[primaryCat]?.top_values
      ? analytics.summary[primaryCat].top_values.map((item) => ({
          label: item.value,
          value: item.count,
        }))
      : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Records */}
        <Card glow="emerald" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total Records</span>
            <Badge variant="emerald">Active</Badge>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">{dataset.row_count.toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-2">rows</span>
          </div>
          <span className="text-[11px] text-gray-400">{dataset.col_count} total schema attributes</span>
        </Card>

        {/* KPI 2: Data Quality Score */}
        <Card glow="blue" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Data Quality Score</span>
            <Badge variant={qualityScore >= 90 ? "emerald" : qualityScore >= 70 ? "amber" : "red"}>
              {qualityScore >= 90 ? "Pristine" : qualityScore >= 70 ? "Acceptable" : "Action Needed"}
            </Badge>
          </div>
          <div className="my-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold font-mono text-white">{qualityScore}</span>
            <span className="text-sm font-semibold text-gray-400">/ 100</span>
          </div>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${qualityScore}%` }}
            />
          </div>
        </Card>

        {/* KPI 3: Primary Metric Mean */}
        <Card glow="purple" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate max-w-[130px]">
              {primaryMetric ? `Avg ${primaryMetric}` : "Metric Baseline"}
            </span>
            <Badge variant="purple">Empirical</Badge>
          </div>
          <div className="my-3">
            <span className="text-3xl font-bold font-mono text-white">
              {primaryStats?.mean !== undefined && primaryStats.mean !== null
                ? primaryStats.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })
                : "—"}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            {primaryStats?.std_dev != null ? `StdDev: ±${primaryStats.std_dev.toLocaleString()}` : "Continuous scale"}
          </span>
        </Card>

        {/* KPI 4: Cleanliness Status */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Data Provenance</span>
            <Badge variant={dataset.is_cleaned ? "emerald" : "neutral"}>
              {dataset.is_cleaned ? "Cleaned" : "Raw Original"}
            </Badge>
          </div>
          <div className="my-3">
            <span className="text-base font-semibold text-white truncate block">{dataset.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("cleaning")}
              className="text-[11px] font-semibold text-[var(--accent-emerald)] hover:underline cursor-pointer"
            >
              Open Cleaning Studio →
            </button>
          </div>
        </Card>
      </div>

      {/* Main Charts & Quality Diagnostic Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Trend Preview */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Primary Trend & Progression</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Plotted: {analytics?.chart_data?.series_name || primaryMetric || "Values"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("graph-studio")}>
              Graph Studio ↗
            </Button>
          </div>
          {analytics?.chart_data ? (
            <LineAreaChart
              labels={analytics.chart_data.labels}
              values={analytics.chart_data.values}
              height={260}
              color="emerald"
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-500">Loading chart telemetry…</div>
          )}
        </Card>

        {/* Donut Category Composition / Warnings */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Category Composition</h3>
              <p className="text-xs text-[var(--text-muted)]">{primaryCat || "Categorical distribution"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("profile")}>
              Profile ↗
            </Button>
          </div>
          {donutData.length > 0 ? (
            <DonutChart data={donutData} size={200} />
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-500">
              No categorical features found.
            </div>
          )}
        </Card>
      </div>

      {/* Quality Warnings & Quick Insight Pills */}
      {analytics?.quality_profile && analytics.quality_profile.warnings.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400 text-sm font-bold">⚠ Data Quality Audit Warnings</span>
            <Badge variant="amber">{analytics.quality_profile.warnings.length} issues flagged</Badge>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
            {analytics.quality_profile.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Quick Access Workspace Launchers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => onNavigate("profile")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">📊</span>
          <span className="text-xs font-semibold text-white block">Data Profile</span>
          <span className="text-[10px] text-gray-400">5-number stats</span>
        </button>

        <button
          onClick={() => onNavigate("cleaning")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">✨</span>
          <span className="text-xs font-semibold text-white block">Clean Studio</span>
          <span className="text-[10px] text-gray-400">Non-destructive</span>
        </button>

        <button
          onClick={() => onNavigate("forecasting")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">🔮</span>
          <span className="text-xs font-semibold text-white block">Forecasting</span>
          <span className="text-[10px] text-gray-400">Confidence bands</span>
        </button>

        <button
          onClick={() => onNavigate("anomalies")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">⚡</span>
          <span className="text-xs font-semibold text-white block">Anomalies</span>
          <span className="text-[10px] text-gray-400">Z-Score / IQR</span>
        </button>

        <button
          onClick={() => onNavigate("whatif")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">🎛️</span>
          <span className="text-xs font-semibold text-white block">What-If</span>
          <span className="text-[10px] text-gray-400">Sensitivity modeling</span>
        </button>

        <button
          onClick={() => onNavigate("reports")}
          className="p-4 rounded-2xl glass-card bg-white/[0.02] hover:bg-white/[0.06] transition-all text-center group cursor-pointer border border-white/5"
        >
          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">📄</span>
          <span className="text-xs font-semibold text-white block">Briefings</span>
          <span className="text-[10px] text-gray-400">Executive exports</span>
        </button>
      </div>
    </div>
  );
}
