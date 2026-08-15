"use client";

import React, { useState, useEffect } from "react";
import { AnalyticsData, DatasetInfo, ForecastData } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { useToast } from "../layout/Toast";

interface ForecastingViewProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
}

export function ForecastingView({ dataset, analytics }: ForecastingViewProps) {
  const toast = useToast();

  const [metric, setMetric] = useState<string>("");
  const [dimension, setDimension] = useState<string>("");
  const [horizon, setHorizon] = useState<number>(30);
  const [modelType, setModelType] = useState<"linear" | "exponential" | "moving_average">("linear");
  const [confidence, setConfidence] = useState<number>(0.95);

  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const columns = analytics?.columns || [];
  const numCols = columns.filter((c) => c.type === "numeric");
  const dimCols = columns.filter((c) => c.type !== "numeric");

  useEffect(() => {
    if (numCols.length > 0 && !metric) setMetric(numCols[0].name);
    if (dimCols.length > 0 && !dimension) setDimension(dimCols[0].name);
  }, [analytics]);

  useEffect(() => {
    if (dataset && metric) {
      loadForecastData();
    }
  }, [dataset, metric, dimension, horizon, modelType, confidence]);

  async function loadForecastData() {
    if (!dataset || !metric) return;
    setLoading(true);
    try {
      const res = await api.getForecast(dataset.id, metric, dimension, horizon, modelType, confidence);
      setForecast(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate forecast projection");
    } finally {
      setLoading(false);
    }
  }

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a time-series dataset to run forecasting.</div>;
  }

  // Combine history + forecast points for unified chart rendering
  const historyPoints = forecast?.history || [];
  const forecastPoints = forecast?.forecast || [];

  const allPoints = [
    ...historyPoints.map((p) => ({ label: p.label, value: p.value, isForecast: false, lower: p.value, upper: p.value })),
    ...forecastPoints.map((p) => ({ label: p.label, value: p.forecast, isForecast: true, lower: p.lower_bound, upper: p.upper_bound })),
  ];

  const width = 680;
  const height = 300;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allVals = allPoints.flatMap((p) => [p.value, p.lower, p.upper]);
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1);
  const valRange = maxVal - minVal || 1;

  const getX = (i: number) => padding.left + (i / (allPoints.length - 1 || 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / valRange) * chartH;

  // History path vs Forecast path
  const histLen = historyPoints.length;
  const histPath = historyPoints.map((p, i) => `${getX(i)},${getY(p.value)}`).join(" ");
  const forePath = allPoints.slice(histLen - 1).map((p, i) => `${getX(histLen - 1 + i)},${getY(p.value)}`).join(" ");

  // Confidence Interval Polygon
  const ciUpper = forecastPoints.map((p, i) => `${getX(histLen + i)},${getY(p.upper_bound)}`);
  const ciLower = [...forecastPoints].reverse().map((p, i) => `${getX(histLen + forecastPoints.length - 1 - i)},${getY(p.lower_bound)}`);
  const ciPolygon = [...ciUpper, ...ciLower].join(" ");

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Predictive Intelligence & Forecasting Studio</span>
            <Badge variant="purple">Statistical Time-Series</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Forward-looking multi-horizon projections with adjustable confidence bands and empirical goodness-of-fit.
          </p>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <Card className="flex flex-wrap items-center gap-4">
        {/* Metric */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Target Metric:</span>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
          >
            {numCols.map((c) => (
              <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dimension */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Date Dimension:</span>
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Horizon */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Horizon:</span>
          <div className="flex rounded-xl bg-white/5 p-0.5 border border-white/10">
            {[7, 30, 90, 180, 365].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  horizon === h ? "bg-[var(--accent-emerald)] text-black font-bold" : "text-gray-400 hover:text-white"
                }`}
              >
                {h}d
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Model:</span>
          <select
            value={modelType}
            onChange={(e: any) => setModelType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
          >
            <option value="linear" className="bg-[#0b0f19]">Adaptive Trend Regression</option>
            <option value="exponential" className="bg-[#0b0f19]">Exponential Growth</option>
            <option value="moving_average" className="bg-[#0b0f19]">Weighted Moving Average</option>
          </select>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Confidence:</span>
          <select
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
          >
            <option value={0.80} className="bg-[#0b0f19]">80% Margin</option>
            <option value={0.95} className="bg-[#0b0f19]">95% Standard</option>
            <option value={0.99} className="bg-[#0b0f19]">99% Conservative</option>
          </select>
        </div>
      </Card>

      {/* Main Forecast Visualizer & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Projected {metric} (+{horizon} Days Horizon)
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                {forecast?.model_type} • Confidence Interval: {forecast?.confidence_interval}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Historical
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Forecast
              </span>
            </div>
          </div>

          <div className="py-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
              {/* Grid lines */}
              {[0, 0.33, 0.66, 1].map((pct, i) => {
                const y = padding.top + chartH * (1 - pct);
                const val = minVal + valRange * pct;
                return (
                  <g key={i}>
                    <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <text x={padding.left - 8} y={y + 3} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="monospace">
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Confidence Interval Band */}
              {ciPolygon && <polygon points={ciPolygon} fill="rgba(167, 139, 250, 0.15)" />}

              {/* Historical Line */}
              {histPath && (
                <polyline fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" points={histPath} />
              )}

              {/* Forecast Line (Dashed) */}
              {forePath && (
                <polyline fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" points={forePath} />
              )}
            </svg>
          </div>
        </Card>

        {/* Model Metrics & Scorecard */}
        <Card className="space-y-4 flex flex-col justify-between">
          <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
            Model Diagnostics
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-gray-400 block uppercase">Projected Growth</span>
              <span
                className={`text-2xl font-bold font-mono ${
                  (forecast?.growth_rate_pct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {(forecast?.growth_rate_pct ?? 0) >= 0 ? "+" : ""}
                {forecast?.growth_rate_pct ?? 0}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-gray-400 block uppercase">Trend Slope (β₁)</span>
              <span className="text-lg font-bold font-mono text-white">
                {forecast?.trend_slope?.toFixed(3) ?? "0.000"} / step
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-gray-400 block uppercase">R² Goodness of Fit</span>
              <span className="text-lg font-bold font-mono text-purple-400">
                {forecast?.r_squared?.toFixed(3) ?? "0.000"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200">
            Confidence bands illustrate statistical 2σ dispersion boundaries.
          </div>
        </Card>
      </div>

      {/* Detailed Forecast Points Table */}
      {forecastPoints.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Projected Point-in-Time Schedule</h3>
          <div className="overflow-x-auto max-h-64 border border-white/5 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0f19] border-b border-white/10 sticky top-0">
                <tr>
                  <th className="p-3 font-semibold text-white">Period</th>
                  <th className="p-3 font-semibold text-emerald-400">Projected Value</th>
                  <th className="p-3 font-semibold text-purple-300">Lower Bound ({forecast?.confidence_interval})</th>
                  <th className="p-3 font-semibold text-purple-300">Upper Bound ({forecast?.confidence_interval})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {forecastPoints.map((pt, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="p-2.5 font-mono text-gray-300">{pt.label}</td>
                    <td className="p-2.5 font-mono font-bold text-white">{pt.forecast.toLocaleString()}</td>
                    <td className="p-2.5 font-mono text-gray-400">{pt.lower_bound.toLocaleString()}</td>
                    <td className="p-2.5 font-mono text-gray-400">{pt.upper_bound.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
