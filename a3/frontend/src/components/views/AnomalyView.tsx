"use client";

import React, { useState, useEffect } from "react";
import { AnomaliesData, DatasetInfo } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { useToast } from "../layout/Toast";

interface AnomalyViewProps {
  dataset: DatasetInfo | null;
}

export function AnomalyView({ dataset }: AnomalyViewProps) {
  const toast = useToast();
  const [threshold, setThreshold] = useState<number>(2.0);
  const [method, setMethod] = useState<"z_score" | "iqr">("z_score");
  const [severityFilter, setSeverityFilter] = useState<"all" | "mild" | "high" | "critical">("all");

  const [anomalies, setAnomalies] = useState<AnomaliesData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (dataset) {
      loadAnomaliesData();
    }
  }, [dataset, threshold, method]);

  async function loadAnomaliesData() {
    if (!dataset) return;
    setLoading(true);
    try {
      const res = await api.getAnomalies(dataset.id, threshold, method);
      setAnomalies(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to scan anomalies");
    } finally {
      setLoading(false);
    }
  }

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to detect anomalies.</div>;
  }

  const items = anomalies?.anomalies || [];
  const filtered = items.filter((item) => {
    if (severityFilter === "all") return true;
    return item.severity === severityFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Statistical Anomaly & Outlier Scanner</span>
            <Badge variant="amber">Z-Score & IQR</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Scan numerical features to highlight mathematical outliers, spike deviations, and rare anomalies.
          </p>
        </div>
      </div>

      {/* Threshold & Method Configuration Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          {/* Method Selection */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">Detection Method:</span>
            <select
              value={method}
              onChange={(e: any) => setMethod(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
            >
              <option value="z_score" className="bg-[#0b0f19]">Standard Score (Z-Score &gt; σ)</option>
              <option value="iqr" className="bg-[#0b0f19]">Interquartile Range (IQR Fence)</option>
            </select>
          </div>

          {/* Threshold Slider */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-400 font-medium">Sensitivity Threshold:</span>
            <input
              type="range"
              min="1.5"
              max="4.0"
              step="0.25"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-32 accent-[var(--accent-emerald)] cursor-pointer"
            />
            <span className="font-mono font-bold text-emerald-400 text-xs">{threshold}σ</span>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
          {(["all", "mild", "high", "critical"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-semibold transition-colors cursor-pointer ${
                severityFilter === sev ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </Card>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Total Anomalies</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {anomalies?.total_anomalies ?? 0}
          </div>
          <span className="text-[10px] text-gray-400">Above {threshold}σ deviation</span>
        </Card>

        <Card className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Anomaly Rate</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {anomalies?.anomaly_rate_pct ?? 0}%
          </div>
          <span className="text-[10px] text-gray-400">Of scanned numerical data points</span>
        </Card>

        <Card className="text-center py-4">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider">Scanned Columns</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {anomalies?.scanned_columns?.length ?? 0}
          </div>
          <span className="text-[10px] text-gray-400">Continuous numerical features</span>
        </Card>
      </div>

      {/* Anomalies Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Detected Anomaly Events ({filtered.length})</h3>
          <span className="text-[11px] text-[var(--text-muted)]">Ranked by standard deviation deviation</span>
        </div>

        <div className="overflow-x-auto max-h-[460px] border border-white/5 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0f19] border-b border-white/10 sticky top-0">
              <tr>
                <th className="p-3 font-semibold text-white">Row #</th>
                <th className="p-3 font-semibold text-white">Attribute</th>
                <th className="p-3 font-semibold text-white">Outlier Value</th>
                <th className="p-3 font-semibold text-white">Expected Mean</th>
                <th className="p-3 font-semibold text-white">Deviation</th>
                <th className="p-3 font-semibold text-white">Severity</th>
                <th className="p-3 font-semibold text-white">Row Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Scanning statistical distributions…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Zero statistical anomalies found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-gray-400">#{item.row_index}</td>
                    <td className="p-3 font-semibold text-white">{item.column}</td>
                    <td className="p-3 font-mono font-bold text-amber-400">{item.value.toLocaleString()}</td>
                    <td className="p-3 font-mono text-gray-400">{item.expected_mean.toLocaleString()}</td>
                    <td className="p-3 font-mono text-purple-300 font-semibold">{item.z_score.toFixed(2)}σ</td>
                    <td className="p-3">
                      <Badge variant={item.severity === "critical" ? "red" : item.severity === "high" ? "amber" : "blue"}>
                        {item.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 text-[11px] font-mono text-gray-400 truncate max-w-xs">
                      {JSON.stringify(item.context)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
