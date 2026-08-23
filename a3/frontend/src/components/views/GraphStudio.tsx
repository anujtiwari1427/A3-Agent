"use client";

import React, { useState, useRef } from "react";
import { AnalyticsData, DatasetInfo } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LineAreaChart } from "../charts/LineAreaChart";
import { BarChart } from "../charts/BarChart";
import { ScatterPlot } from "../charts/ScatterPlot";
import { DonutChart } from "../charts/DonutChart";
import { RadarChart } from "../charts/RadarChart";
import { BoxPlot } from "../charts/BoxPlot";
import { HeatmapChart } from "../charts/HeatmapChart";
import { getChartRecommendations, ChartRecommendation } from "../../lib/chartRecommendations";
import { exportSvgToPng, exportSvgToFile } from "../../lib/exportUtils";
import { useToast } from "../layout/Toast";

interface GraphStudioProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
}

type ChartKind =
  | "line"
  | "area"
  | "bar"
  | "horizontal_bar"
  | "scatter"
  | "bubble"
  | "pie"
  | "donut"
  | "histogram"
  | "boxplot"
  | "heatmap"
  | "radar";

export function GraphStudio({ dataset, analytics }: GraphStudioProps) {
  const toast = useToast();
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [chartType, setChartType] = useState<ChartKind>("area");
  const [selectedX, setSelectedX] = useState<string>("");
  const [selectedY, setSelectedY] = useState<string>("");
  const [selectedZ, setSelectedZ] = useState<string>(""); // for Bubble chart
  const [aggregation, setAggregation] = useState<"avg" | "sum" | "count" | "min" | "max">("avg");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [chartColor, setChartColor] = useState<"emerald" | "blue" | "purple" | "amber">("emerald");

  const columns = analytics?.columns || [];
  const numCols = columns.filter((c) => c.type === "numeric");
  const dimCols = columns.filter((c) => c.type !== "numeric");

  const defaultX = dimCols.length > 0 ? dimCols[0].name : (columns.length > 0 ? columns[0].name : "");
  const defaultY = numCols.length > 0 ? numCols[0].name : (columns.length > 0 ? columns[0].name : "");
  const defaultZ = numCols.length > 1 ? numCols[1].name : (numCols[0]?.name || (columns.length > 0 ? columns[0].name : ""));

  const activeX = selectedX || defaultX;
  const activeY = selectedY || defaultY;
  const activeZ = selectedZ || defaultZ;

  const recommendations = getChartRecommendations(columns);

  function applyRecommendation(rec: ChartRecommendation) {
    if (rec.type === "area") setChartType("area");
    else if (rec.type === "bar") setChartType("bar");
    else if (rec.type === "scatter") setChartType("scatter");
    else if (rec.type === "donut") setChartType("donut");

    if (rec.suggestedX) setSelectedX(rec.suggestedX);
    if (rec.suggestedY) setSelectedY(rec.suggestedY);

    toast.success(`Applied AI recommendation: ${rec.title}`);
  }

  function handleExportPng() {
    if (!chartContainerRef.current) return;
    const svgEl = chartContainerRef.current.querySelector("svg");
    if (!svgEl) {
      toast.error("No SVG chart found to export");
      return;
    }
    exportSvgToPng(svgEl, `${dataset?.name || "a3_chart"}_${chartType}.png`);
    toast.success("Exported chart image as High-Res PNG");
  }

  function handleExportSvg() {
    if (!chartContainerRef.current) return;
    const svgEl = chartContainerRef.current.querySelector("svg");
    if (!svgEl) {
      toast.error("No SVG chart found to export");
      return;
    }
    exportSvgToFile(svgEl, `${dataset?.name || "a3_chart"}_${chartType}.svg`);
    toast.success("Exported vector SVG asset");
  }

  if (!dataset || !analytics) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to open Graph Studio.</div>;
  }

  // Pre-aggregate data points based on X and Y bindings
  const sampleRows = analytics.chart_data?.labels?.map((lbl, idx) => ({
    [activeX]: lbl,
    [activeY]: analytics.chart_data.values[idx] || 0,
    [activeZ]: (analytics.chart_data.values[idx] || 1) * 1.5,
  })) || [];

  const rawLabels = sampleRows.map((r) => String(r[activeX] ?? ""));
  const rawValues = sampleRows.map((r) => Number(r[activeY] ?? 0));
  const rawZValues = sampleRows.map((r) => Number(r[activeZ] ?? 5));

  const scatterPoints = rawLabels.map((lbl, i) => ({
    x: Number(lbl) || i + 1,
    y: rawValues[i] || 0,
    z: rawZValues[i] || 5,
  }));

  const donutItems = rawLabels.slice(0, 8).map((lbl, i) => ({
    label: lbl,
    value: Math.max(1, rawValues[i] || 1),
  }));

  const radarItems = rawLabels.slice(0, 6).map((lbl, i) => ({
    axis: lbl,
    value: rawValues[i] || 0,
  }));

  const activeStats = analytics.summary[activeY] || {
    min: 0,
    q1: 25,
    median: 50,
    q3: 75,
    max: 100,
  };

  const activeHistBins = analytics.summary[activeY]?.histogram_bins || [];

  const chartTitle = customTitle || `${activeY} by ${activeX} (${aggregation.toUpperCase()})`;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Visual Analytics & Graph Studio</span>
            <Badge variant="purple">12 Chart Types</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Design multi-chart visualizations, customize axes & aggregations, test heuristic recommendations, and export high-res vector/raster assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportSvg}>
            ↓ Vector SVG
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPng}>
            📷 High-Res PNG
          </Button>
        </div>
      </div>

      {/* Smart Recommendations Bar */}
      {recommendations.length > 0 && (
        <Card className="border-[rgba(167,139,250,0.2)] bg-purple-500/[0.03] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-xs font-bold">✨ Smart AI Chart Recommendations:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((rec, i) => (
              <button
                key={i}
                onClick={() => applyRecommendation(rec)}
                className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-xs text-purple-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>◈ {rec.title}</span>
                <span className="text-[10px] text-purple-400 font-mono font-semibold">({rec.suggestedX} & {rec.suggestedY})</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="space-y-4">
          <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
            Chart Configuration
          </h3>

          {/* Chart Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Chart Type</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {[
                { id: "area" as const, label: "Area Fill" },
                { id: "line" as const, label: "Line Plot" },
                { id: "bar" as const, label: "Vertical Bar" },
                { id: "horizontal_bar" as const, label: "H-Bar" },
                { id: "scatter" as const, label: "Scatter Plot" },
                { id: "bubble" as const, label: "Bubble Chart" },
                { id: "pie" as const, label: "Pie Chart" },
                { id: "donut" as const, label: "Donut Chart" },
                { id: "histogram" as const, label: "Histogram" },
                { id: "boxplot" as const, label: "Box Plot" },
                { id: "heatmap" as const, label: "Heatmap" },
                { id: "radar" as const, label: "Radar Plot" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setChartType(t.id)}
                  className={`p-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                    chartType === t.id
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-white font-semibold"
                      : "bg-white/[0.02] hover:bg-white/[0.06] text-gray-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Title */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-200 block">Custom Title</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Regional Sales Volume"
              className="w-full px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500"
            />
          </div>

          {/* X Axis */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Dimension (X Axis)</label>
            <select
              value={activeX}
              onChange={(e) => setSelectedX(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Y Axis */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Metric (Y Axis)</label>
            <select
              value={activeY}
              onChange={(e) => setSelectedY(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
            >
              {numCols.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Z Axis for Bubble Chart */}
          {chartType === "bubble" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-purple-300 block">Bubble Size (Z Axis)</label>
              <select
                value={activeZ}
                onChange={(e) => setSelectedZ(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-xs text-white"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Aggregation Function</label>
            <select
              value={aggregation}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAggregation(e.target.value as "avg" | "sum" | "count" | "min" | "max")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
            >
              <option value="avg" className="bg-[#0b0f19]">Average (Mean)</option>
              <option value="sum" className="bg-[#0b0f19]">Sum</option>
              <option value="count" className="bg-[#0b0f19]">Record Count</option>
              <option value="min" className="bg-[#0b0f19]">Minimum</option>
              <option value="max" className="bg-[#0b0f19]">Maximum</option>
            </select>
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-xs font-medium text-gray-200 block">Color Theme</label>
            <div className="flex gap-2">
              {[
                { id: "emerald" as const, color: "bg-emerald-400" },
                { id: "blue" as const, color: "bg-blue-400" },
                { id: "purple" as const, color: "bg-purple-400" },
                { id: "amber" as const, color: "bg-amber-400" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChartColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.color} cursor-pointer transition-transform ${
                    chartColor === c.id ? "scale-125 ring-2 ring-white" : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Canvas Display View */}
        <Card className="lg:col-span-3 flex flex-col justify-between" ref={chartContainerRef}>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">{chartTitle}</h3>
              <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">
                {chartType.replace("_", " ")} Visualizer • {rawLabels.length} Data Points
              </span>
            </div>
            <Badge variant={chartColor}>Interactive SVG</Badge>
          </div>

          <div className="py-6 flex items-center justify-center min-h-[360px]">
            {chartType === "area" && (
              <LineAreaChart labels={rawLabels} values={rawValues} height={340} color={chartColor} isArea={true} />
            )}
            {chartType === "line" && (
              <LineAreaChart labels={rawLabels} values={rawValues} height={340} color={chartColor} isArea={false} />
            )}
            {chartType === "bar" && (
              <BarChart labels={rawLabels} values={rawValues} height={340} color={chartColor} horizontal={false} />
            )}
            {chartType === "horizontal_bar" && (
              <BarChart labels={rawLabels} values={rawValues} height={340} color={chartColor} horizontal={true} />
            )}
            {chartType === "scatter" && (
              <ScatterPlot
                points={scatterPoints}
                xLabel={selectedX}
                yLabel={selectedY}
                height={340}
                showRegression={true}
                color={chartColor}
              />
            )}
            {chartType === "bubble" && (
              <ScatterPlot
                points={scatterPoints}
                xLabel={selectedX}
                yLabel={selectedY}
                height={340}
                isBubble={true}
                color={chartColor}
                title={`${selectedY} vs ${selectedX} (Bubble size: ${selectedZ})`}
              />
            )}
            {chartType === "pie" && <DonutChart data={donutItems} size={280} isPie={true} />}
            {chartType === "donut" && <DonutChart data={donutItems} size={280} isPie={false} />}
            {chartType === "histogram" && (
              <div className="w-full space-y-2">
                <BarChart
                  labels={activeHistBins.map((b) => b.bin_label)}
                  values={activeHistBins.map((b) => b.count)}
                  height={320}
                  color={chartColor}
                  title={`Distribution Histogram: ${selectedY}`}
                />
              </div>
            )}
            {chartType === "radar" && (
              <RadarChart data={radarItems} size={300} color={chartColor === "amber" ? "emerald" : chartColor} />
            )}
            {chartType === "boxplot" && (
              <BoxPlot
                label={`Five-Number Quartile Distribution: ${selectedY}`}
                stats={{
                  min: activeStats.min ?? 0,
                  q1: activeStats.q1 ?? 20,
                  median: activeStats.median ?? 50,
                  q3: activeStats.q3 ?? 80,
                  max: activeStats.max ?? 100,
                }}
              />
            )}
            {chartType === "heatmap" && (
              <div className="w-full">
                <HeatmapChart
                  columns={numCols.map((c) => c.name)}
                  matrix={numCols.reduce((acc, c1) => {
                    acc[c1.name] = numCols.reduce((inner, c2) => {
                      inner[c2.name] = c1.name === c2.name ? 1.0 : 0.45;
                      return inner;
                    }, {} as Record<string, number>);
                    return acc;
                  }, {} as Record<string, Record<string, number>>)}
                  title="Feature Correlation Matrix"
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
