"use client";

import React, { useState, useEffect } from "react";
import {
  AnalyticsData,
  CorrelationData,
  DatasetInfo,
  GroupByData,
  HypothesisTestData,
  RegressionData,
} from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { HeatmapChart } from "../charts/HeatmapChart";
import { ScatterPlot } from "../charts/ScatterPlot";
import { BarChart } from "../charts/BarChart";
import { useToast } from "../layout/Toast";

interface AnalyticsStudioProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
}

export function AnalyticsStudio({ dataset, analytics }: AnalyticsStudioProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"correlations" | "regression" | "groupby" | "hypothesis">("correlations");

  // Correlations State
  const [correlations, setCorrelations] = useState<CorrelationData | null>(null);
  const [corrMetricType, setCorrMetricType] = useState<"pearson" | "spearman">("pearson");
  const [loadingCorrelations, setLoadingCorrelations] = useState(false);

  // Regression State
  const [featureCol, setFeatureCol] = useState<string>("");
  const [targetCol, setTargetCol] = useState<string>("");
  const [regression, setRegression] = useState<RegressionData | null>(null);
  const [loadingRegression, setLoadingRegression] = useState(false);

  // Group-By State
  const [groupCol, setGroupCol] = useState<string>("");
  const [metricCol, setMetricCol] = useState<string>("");
  const [groupByData, setGroupByData] = useState<GroupByData | null>(null);
  const [loadingGroupBy, setLoadingGroupBy] = useState(false);

  // Hypothesis Testing State
  const [hypoGroupCol, setHypoGroupCol] = useState<string>("");
  const [hypoSegA, setHypoSegA] = useState<string>("");
  const [hypoSegB, setHypoSegB] = useState<string>("");
  const [hypoMetricCol, setHypoMetricCol] = useState<string>("");
  const [hypoConf, setHypoConf] = useState<number>(0.95);
  const [hypoResult, setHypoResult] = useState<HypothesisTestData | null>(null);
  const [loadingHypo, setLoadingHypo] = useState(false);

  const numCols = analytics?.columns?.filter((c) => c.type === "numeric") || [];
  const catCols = analytics?.columns?.filter((c) => c.type !== "numeric") || [];

  useEffect(() => {
    let cancelled = false;
    if (!dataset) return;

    async function load() {
      setLoadingCorrelations(true);
      try {
        const res = await api.getCorrelations(dataset!.id);
        if (!cancelled) {
          setCorrelations(res);
        }
      } catch {
        // fallback
      } finally {
        if (!cancelled) {
          setLoadingCorrelations(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [dataset]);

  // Derived initial defaults
  const activeFeatureCol = featureCol || (numCols.length > 0 ? numCols[0].name : "");
  const activeTargetCol = targetCol || (numCols.length > 1 ? numCols[1].name : activeFeatureCol);
  const activeGroupCol = groupCol || (catCols.length > 0 ? catCols[0].name : "");
  const activeMetricCol = metricCol || (numCols.length > 0 ? numCols[0].name : "");
  const activeHypoGroupCol = hypoGroupCol || (catCols.length > 0 ? catCols[0].name : "");
  const topCatVals = activeHypoGroupCol && analytics?.summary[activeHypoGroupCol]?.top_values ? analytics.summary[activeHypoGroupCol].top_values : [];
  const activeHypoSegA = hypoSegA || (topCatVals.length > 0 ? topCatVals[0].value : "");
  const activeHypoSegB = hypoSegB || (topCatVals.length > 1 ? topCatVals[1].value : "");
  const activeHypoMetricCol = hypoMetricCol || (numCols.length > 0 ? numCols[0].name : "");

  async function handleRunRegression() {
    if (!dataset || !activeFeatureCol || !activeTargetCol) return;
    setLoadingRegression(true);
    try {
      const res = await api.getRegression(dataset.id, activeFeatureCol, activeTargetCol);
      setRegression(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to solve linear regression";
      toast.error(message);
    } finally {
      setLoadingRegression(false);
    }
  }

  async function handleRunGroupBy() {
    if (!dataset || !activeGroupCol || !activeMetricCol) return;
    setLoadingGroupBy(true);
    try {
      const res = await api.getGroupBy(dataset.id, activeGroupCol, [activeMetricCol]);
      setGroupByData(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to compute group-by aggregations";
      toast.error(message);
    } finally {
      setLoadingGroupBy(false);
    }
  }

  async function handleRunHypothesis() {
    if (!dataset || !activeHypoGroupCol || !activeHypoSegA || !activeHypoSegB || !activeHypoMetricCol) {
      toast.error("Please specify both segments and a metric to test.");
      return;
    }
    setLoadingHypo(true);
    try {
      const res = await api.getHypothesisTest(dataset.id, {
        group_column: activeHypoGroupCol,
        segment_a: activeHypoSegA,
        segment_b: activeHypoSegB,
        metric_column: activeHypoMetricCol,
        confidence_level: hypoConf,
      });
      setHypoResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to compute hypothesis test";
      toast.error(message);
    } finally {
      setLoadingHypo(false);
    }
  }

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to explore analytics.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Sub-workspace Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Advanced Analytics Studio</span>
            <Badge variant="blue">Inferential & Comparative</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Explore multi-column correlations, bivariate regressions, segment group-by, and hypothesis testing.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 flex-wrap">
          <button
            onClick={() => setActiveTab("correlations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "correlations" ? "bg-[var(--accent-emerald)] text-black" : "text-gray-300 hover:text-white"
            }`}
          >
            Correlations Heatmap
          </button>
          <button
            onClick={() => {
              setActiveTab("regression");
              if (!regression && featureCol && targetCol) handleRunRegression();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "regression" ? "bg-[var(--accent-emerald)] text-black" : "text-gray-300 hover:text-white"
            }`}
          >
            Regression & R²
          </button>
          <button
            onClick={() => {
              setActiveTab("groupby");
              if (!groupByData && groupCol && metricCol) handleRunGroupBy();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "groupby" ? "bg-[var(--accent-emerald)] text-black" : "text-gray-300 hover:text-white"
            }`}
          >
            Segment Breakdown
          </button>
          <button
            onClick={() => {
              setActiveTab("hypothesis");
              if (!hypoResult && hypoGroupCol && hypoSegA && hypoSegB && hypoMetricCol) handleRunHypothesis();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "hypothesis" ? "bg-[var(--accent-emerald)] text-black" : "text-gray-300 hover:text-white"
            }`}
          >
            Hypothesis Testing
          </button>
        </div>
      </div>

      {/* Tab 1: Correlations */}
      {activeTab === "correlations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                Correlation Heatmap Matrix
              </span>
              <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  onClick={() => setCorrMetricType("pearson")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    corrMetricType === "pearson" ? "bg-[var(--accent-emerald)] text-black font-semibold" : "text-gray-400"
                  }`}
                >
                  Pearson (Linear)
                </button>
                <button
                  onClick={() => setCorrMetricType("spearman")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    corrMetricType === "spearman" ? "bg-[var(--accent-emerald)] text-black font-semibold" : "text-gray-400"
                  }`}
                >
                  Spearman (Rank)
                </button>
              </div>
            </div>

            {correlations ? (
              <HeatmapChart
                columns={correlations.columns}
                matrix={correlations.matrix}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-gray-500">
                {loadingCorrelations ? "Calculating correlation coefficients…" : "No correlations found."}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
              Top Ranked Pairings
            </h3>
            {correlations?.top_correlations && correlations.top_correlations.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {correlations.top_correlations.map((pair, idx) => {
                  const score = corrMetricType === "pearson" ? pair.pearson : pair.spearman;
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-gray-200 truncate">{pair.col_a} & {pair.col_b}</span>
                        <span
                          className={`font-mono font-bold ${
                            score >= 0.7 ? "text-emerald-400" : score <= -0.7 ? "text-red-400" : "text-blue-400"
                          }`}
                        >
                          r = {score.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <Badge variant={Math.abs(score) >= 0.7 ? "emerald" : "neutral"} size="sm">
                          {pair.strength.replace("_", " ")}
                        </Badge>
                        <span className="text-gray-500 font-mono">Rank #{idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-10">No significant numerical pairings detected.</div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Regression */}
      {activeTab === "regression" && (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Feature (X):</span>
              <select
                value={activeFeatureCol}
                onChange={(e) => setFeatureCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Target (Y):</span>
              <select
                value={activeTargetCol}
                onChange={(e) => setTargetCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="primary" size="sm" onClick={handleRunRegression} loading={loadingRegression}>
              Solve Linear Regression
            </Button>
          </Card>

          {regression && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <ScatterPlot
                  points={regression.sample_points}
                  xLabel={regression.feature_column}
                  yLabel={regression.target_column}
                  showRegression={true}
                  slope={regression.slope}
                  intercept={regression.intercept}
                  rSquared={regression.r_squared}
                  title={`Regression Scatter: ${regression.feature_column} vs ${regression.target_column}`}
                />
              </Card>

              <Card className="space-y-4">
                <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
                  Model Equation & Goodness of Fit
                </h3>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 font-mono text-xs text-purple-300 break-words">
                  {regression.equation}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Slope (β₁):</span>
                    <span className="font-mono font-bold text-white">{regression.slope}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Intercept (β₀):</span>
                    <span className="font-mono font-bold text-white">{regression.intercept}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">R² Coefficient:</span>
                    <span className="font-mono font-bold text-emerald-400">{regression.r_squared}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Standard Error:</span>
                    <span className="font-mono font-bold text-white">{regression.std_error}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Group-By */}
      {activeTab === "groupby" && (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Group Dimension:</span>
              <select
                value={activeGroupCol}
                onChange={(e) => setGroupCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {catCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Aggregate Metric:</span>
              <select
                value={activeMetricCol}
                onChange={(e) => setMetricCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="primary" size="sm" onClick={handleRunGroupBy} loading={loadingGroupBy}>
              Compute Segment Breakdown
            </Button>
          </Card>

          {groupByData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <BarChart
                  labels={groupByData.buckets.map((b) => b.group_key)}
                  values={groupByData.buckets.map((b) => b.aggregates[`${activeMetricCol}_sum`] || b.count)}
                  title={`Segment Sum: ${activeMetricCol} by ${activeGroupCol}`}
                  color="emerald"
                />
              </Card>

              <Card>
                <BarChart
                  labels={groupByData.buckets.map((b) => b.group_key)}
                  values={groupByData.buckets.map((b) => b.aggregates[`${activeMetricCol}_avg`] || 0)}
                  title={`Segment Average: ${activeMetricCol} by ${activeGroupCol}`}
                  color="blue"
                  horizontal={true}
                />
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Hypothesis Testing & Two-Sample Comparisons */}
      {activeTab === "hypothesis" && (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Dimension:</span>
              <select
                value={activeHypoGroupCol}
                onChange={(e) => {
                  setHypoGroupCol(e.target.value);
                  const topVals = analytics?.summary[e.target.value]?.top_values || [];
                  if (topVals.length >= 2) {
                    setHypoSegA(topVals[0].value);
                    setHypoSegB(topVals[1].value);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {catCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Segment A:</span>
              <input
                type="text"
                value={activeHypoSegA}
                onChange={(e) => setHypoSegA(e.target.value)}
                placeholder="e.g. Technology"
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white w-28"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Segment B:</span>
              <input
                type="text"
                value={activeHypoSegB}
                onChange={(e) => setHypoSegB(e.target.value)}
                placeholder="e.g. Furniture"
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white w-28"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Metric (Y):</span>
              <select
                value={activeHypoMetricCol}
                onChange={(e) => setHypoMetricCol(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Confidence:</span>
              <select
                value={hypoConf}
                onChange={(e) => setHypoConf(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              >
                <option value={0.90} className="bg-[#0b0f19]">90%</option>
                <option value={0.95} className="bg-[#0b0f19]">95% (Standard)</option>
                <option value={0.99} className="bg-[#0b0f19]">99% (Rigorous)</option>
              </select>
            </div>

            <Button variant="primary" size="sm" onClick={handleRunHypothesis} loading={loadingHypo}>
              Run Welch&apos;s T-Test
            </Button>
          </Card>

          {hypoResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">
                    Statistical Significance: {hypoResult.segment_a} vs {hypoResult.segment_b}
                  </h3>
                  <Badge variant={hypoResult.is_significant ? "emerald" : "amber"}>
                    {hypoResult.is_significant ? "Significant Difference" : "No Significant Difference"}
                  </Badge>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-gray-200 leading-relaxed">
                  <p className="font-semibold text-white mb-1">Empirical Conclusion:</p>
                  <p>{hypoResult.conclusion}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase">{hypoResult.segment_a} Mean</span>
                    <span className="text-sm font-mono font-bold text-white">{hypoResult.mean_a.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 block">n = {hypoResult.count_a}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase">{hypoResult.segment_b} Mean</span>
                    <span className="text-sm font-mono font-bold text-white">{hypoResult.mean_b.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 block">n = {hypoResult.count_b}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase">Mean Difference (Δ)</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">
                      {hypoResult.mean_difference >= 0 ? "+" : ""}{hypoResult.mean_difference.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase">p-Value</span>
                    <span className={`text-sm font-mono font-bold ${hypoResult.is_significant ? "text-emerald-400" : "text-amber-400"}`}>
                      {hypoResult.p_value.toFixed(4)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="space-y-4">
                <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
                  Hypothesis Test Statistics
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">T-Statistic:</span>
                    <span className="font-mono font-bold text-white">{hypoResult.t_statistic}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">Confidence Level:</span>
                    <span className="font-mono font-bold text-white">{(hypoResult.confidence_level * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-gray-400">95% CI Lower Bound:</span>
                    <span className="font-mono font-bold text-purple-300">{hypoResult.ci_lower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">95% CI Upper Bound:</span>
                    <span className="font-mono font-bold text-purple-300">{hypoResult.ci_upper.toLocaleString()}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
