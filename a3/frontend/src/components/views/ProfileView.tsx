"use client";

import React, { useState } from "react";
import { AnalyticsData, DatasetInfo } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { BoxPlot } from "../charts/BoxPlot";
import { BarChart } from "../charts/BarChart";

interface ProfileViewProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
  loading: boolean;
}

export function ProfileView({ dataset, analytics, loading }: ProfileViewProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "numeric" | "string" | "date" | "boolean">("all");
  const [searchCol, setSearchCol] = useState<string>("");

  if (!dataset || !analytics) {
    return (
      <div className="p-12 text-center text-xs text-gray-500">
        Please select or upload a dataset to view its statistical profile.
      </div>
    );
  }

  const columns = analytics.columns || [];
  const summary = analytics.summary || {};

  const filteredColumns = columns.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (searchCol && !c.name.toLowerCase().includes(searchCol.toLowerCase())) return false;
    return true;
  });

  const activeCol = selectedColumn || (filteredColumns.length > 0 ? filteredColumns[0].name : columns[0]?.name || "");
  const activeSummary = summary[activeCol];
  const activeSchema = columns.find((c) => c.name === activeCol);

  const isNumeric = activeSchema?.type === "numeric";

  // Histogram bins for numeric column
  const histLabels = activeSummary?.histogram_bins?.map((b) => b.bin_label) || [];
  const histValues = activeSummary?.histogram_bins?.map((b) => b.count) || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Quality Radar Audit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Dataset Intelligence & Profiling</span>
            <Badge variant="emerald">Automated Audit</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {analytics.dataset_summary_text || `Comprehensive statistical distributions, percentiles, and quality metrics for ${dataset.name}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Badge variant="blue">Updating Profile…</Badge>}
          <Badge variant={analytics.quality_profile.overall_score >= 80 ? "emerald" : "amber"} size="md">
            Data Quality Score: {analytics.quality_profile.overall_score}/100
          </Badge>
        </div>
      </div>

      {/* Quality Score Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card glow="emerald" className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Completeness</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {analytics.quality_profile.completeness_score}%
          </div>
          <span className="text-[10px] text-gray-400">Non-null data cells</span>
        </Card>
        <Card glow="blue" className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Uniqueness</span>
          <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
            {analytics.quality_profile.uniqueness_score}%
          </div>
          <span className="text-[10px] text-gray-400">Non-duplicate rows</span>
        </Card>
        <Card glow="purple" className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Validity</span>
          <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
            {analytics.quality_profile.validity_score}%
          </div>
          <span className="text-[10px] text-gray-400">Format conformance</span>
        </Card>
        <Card className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Consistency</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {analytics.quality_profile.consistency_score}%
          </div>
          <span className="text-[10px] text-gray-400">Cross-column alignment</span>
        </Card>
      </div>

      {/* Warnings Banner if any */}
      {analytics.quality_profile.warnings.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/[0.03] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-xs font-bold">⚠ Quality Diagnostic Warnings ({analytics.quality_profile.warnings.length})</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-300">
            {analytics.quality_profile.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 shrink-0 font-bold">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Main Column Profiler: Selector + Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Column Schema List with Search and Filter */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
              Attributes ({columns.length})
            </span>
          </div>

          {/* Search input */}
          <input
            type="text"
            value={searchCol}
            onChange={(e) => setSearchCol(e.target.value)}
            placeholder="Search column name…"
            className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-emerald)]"
          />

          {/* Type Filter Pills */}
          <div className="flex flex-wrap gap-1 text-[10px]">
            {(["all", "numeric", "string", "date", "boolean"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded-md uppercase font-semibold transition-colors cursor-pointer ${
                  typeFilter === t ? "bg-[var(--accent-emerald)] text-black" : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
            {filteredColumns.map((c) => {
              const isSelected = c.name === activeCol;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedColumn(c.name)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-white font-semibold"
                      : "hover:bg-white/5 text-gray-300"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="truncate block font-mono">{c.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {summary[c.name]?.distinct_count || 0} unique
                    </span>
                  </div>
                  <Badge variant={c.type === "numeric" ? "emerald" : c.type === "date" ? "blue" : "purple"}>
                    {c.type}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right: Selected Column Deep Statistics */}
        <Card className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <span>{activeCol}</span>
                <Badge variant={activeSchema?.type === "numeric" ? "emerald" : "purple"}>
                  {activeSchema?.type}
                </Badge>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {activeSummary?.null_count || 0} missing values • {activeSummary?.distinct_count || 0} distinct values
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeSummary?.is_constant && <Badge variant="amber">Constant Column</Badge>}
              {activeSummary?.is_high_cardinality && <Badge variant="blue">High Cardinality</Badge>}
            </div>
          </div>

          {/* Sample Values Preview */}
          {activeSchema?.sample_values && activeSchema.sample_values.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Sample Raw Values:</span>
              <div className="flex flex-wrap gap-1.5">
                {activeSchema.sample_values.map((val, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-xs font-mono text-gray-300 border border-white/5">
                    {String(val)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* If Numeric: 5-Number Summary Grid, Skewness, Kurtosis, Percentiles & Box Plot */}
          {isNumeric && activeSummary?.mean !== undefined && (
            <>
              {/* Primary Central Tendency & Dispersion */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Mean (μ)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.mean?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Median</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.median?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Std Dev (σ)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.std_dev?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Variance (σ²)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.variance?.toLocaleString()}</span>
                </div>
              </div>

              {/* 5-Number Summary / Quartiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Min (Q0)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.min?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Q1 (25th %)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.q1?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Q3 (75th %)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.q3?.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Max (Q4)</span>
                  <span className="text-sm font-mono font-bold text-white">{activeSummary.max?.toLocaleString()}</span>
                </div>
              </div>

              {/* Shape Metrics: Skewness and Kurtosis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Skewness</span>
                    <span className="text-xs text-gray-300">
                      {activeSummary.skewness !== undefined && activeSummary.skewness !== null && Math.abs(activeSummary.skewness) < 0.5
                        ? "Symmetric distribution"
                        : (activeSummary.skewness ?? 0) > 0
                        ? "Right-skewed (positive tail)"
                        : "Left-skewed (negative tail)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-purple-300 text-sm">{activeSummary.skewness ?? "0.00"}</span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Kurtosis (Excess)</span>
                    <span className="text-xs text-gray-300">
                      {(activeSummary.kurtosis ?? 0) > 0 ? "Leptokurtic (Heavy tails)" : "Platykurtic (Light tails)"}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-purple-300 text-sm">{activeSummary.kurtosis ?? "0.00"}</span>
                </div>
              </div>

              {/* Percentiles Table */}
              {activeSummary.percentiles && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Percentile Distribution:</span>
                  <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px]">
                    {Object.entries(activeSummary.percentiles).map(([pKey, pVal]) => (
                      <div key={pKey} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-gray-500 uppercase block text-[9px]">{pKey}</span>
                        <span className="text-white font-bold">{pVal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histogram Distribution */}
              {histValues.length > 0 && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                  <span className="text-xs font-semibold text-gray-300 block">Frequency Histogram Distribution:</span>
                  <BarChart labels={histLabels} values={histValues} height={200} color="emerald" />
                </div>
              )}

              {/* Box and Whisker Plot */}
              {activeSummary.min !== undefined && activeSummary.q1 !== undefined && activeSummary.median !== undefined && activeSummary.q3 !== undefined && activeSummary.max !== undefined && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <BoxPlot
                    label={`Box Plot & Quartiles: ${activeCol}`}
                    stats={{
                      min: activeSummary.min ?? 0,
                      q1: activeSummary.q1 ?? 0,
                      median: activeSummary.median ?? 0,
                      q3: activeSummary.q3 ?? 0,
                      max: activeSummary.max ?? 1,
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Top Frequencies for Categorical / String */}
          {activeSummary?.top_values && activeSummary.top_values.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
                Top Frequencies ({activeSummary.top_values.length})
              </span>
              <div className="space-y-2">
                {activeSummary.top_values.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="font-mono text-gray-200">{item.value || "<Empty>"}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{item.count.toLocaleString()}</span>
                      {item.pct !== undefined && <span className="text-gray-500 font-mono text-[11px]">({item.pct}%)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
