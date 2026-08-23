"use client";

import React, { useState } from "react";

export interface ScatterPoint { x: number; y: number; z?: number; label?: string; }
interface ScatterPlotProps { points: ScatterPoint[]; xLabel?: string; yLabel?: string; height?: number; showRegression?: boolean; isBubble?: boolean; slope?: number; intercept?: number; rSquared?: number; title?: string; color?: "emerald" | "blue" | "purple" | "amber"; }

export function ScatterPlot({ points, xLabel = "X Feature", yLabel = "Y Target", height = 320, showRegression = true, isBubble = false, slope, intercept, rSquared, title, color = "emerald" }: ScatterPlotProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (!points || points.length === 0) return <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">Need at least 2 numerical points for scatter analysis.</div>;
  const width = 680; const padding = { top: 25, right: 30, bottom: 45, left: 60 }; const chartW = width - padding.left - padding.right; const chartH = height - padding.top - padding.bottom;
  const xVals = points.map((p) => p.x); const yVals = points.map((p) => p.y); const zVals = points.map((p) => p.z ?? 5);
  const minX = Math.min(...xVals); const maxX = Math.max(...xVals) || 1; const minY = Math.min(...yVals); const maxY = Math.max(...yVals) || 1; const minZ = Math.min(...zVals); const maxZ = Math.max(...zVals) || 1;
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1; const rangeZ = maxZ - minZ || 1;
  const getCX = (x: number) => padding.left + ((x - minX) / rangeX) * chartW; const getCY = (y: number) => padding.top + chartH - ((y - minY) / rangeY) * chartH; const getRadius = (z: number) => isBubble ? 4 + ((z - minZ) / rangeZ) * 16 : 4.5;
  const pointColor = color === "emerald" ? "#34d399" : color === "blue" ? "#60a5fa" : color === "purple" ? "#a78bfa" : "#fbbf24";
  const lineX1 = getCX(minX); const lineY1 = getCY(slope !== undefined && intercept !== undefined ? slope * minX + intercept : minY); const lineX2 = getCX(maxX); const lineY2 = getCY(slope !== undefined && intercept !== undefined ? slope * maxX + intercept : maxY);
  return <div className="relative w-full overflow-hidden">
    {title && <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span>{rSquared !== undefined && <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/20">R² = {rSquared.toFixed(3)}</span>}</div>}
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
      {[0, 0.33, 0.66, 1].map((pct, i) => { const y = padding.top + chartH * (1 - pct); const valY = minY + rangeY * pct; return <g key={i}><line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" /><text x={padding.left - 8} y={y + 3} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="monospace">{valY >= 1000 ? `${(valY / 1000).toFixed(1)}k` : valY.toFixed(0)}</text></g>; })}
      {[0, 0.5, 1].map((pct, i) => { const x = padding.left + chartW * pct; const valX = minX + rangeX * pct; return <text key={i} x={x} y={padding.top + chartH + 20} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle" fontFamily="monospace">{valX >= 1000 ? `${(valX / 1000).toFixed(1)}k` : valX.toFixed(0)}</text>; })}
      <text x={padding.left + chartW / 2} y={height - 5} fill="rgba(255,255,255,0.5)" fontSize="11" textAnchor="middle">{xLabel}</text>
      <text x={-height / 2} y={15} transform="rotate(-90)" fill="rgba(255,255,255,0.5)" fontSize="11" textAnchor="middle">{yLabel}</text>
      {showRegression && !isBubble && <line x1={lineX1} y1={lineY1} x2={lineX2} y2={lineY2} stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 3" opacity="0.85" />}
      {points.map((p, i) => { const cx = getCX(p.x); const cy = getCY(p.y); const r = getRadius(p.z ?? 5); const isHover = hoverIndex === i; return <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer"><circle cx={cx} cy={cy} r={r + 6} fill="transparent" /><circle cx={cx} cy={cy} r={isHover ? r + 3 : r} fill={isHover ? "#fff" : pointColor} stroke={isHover ? pointColor : "#06080f"} strokeWidth={isBubble ? "1.5" : "1"} opacity={isBubble ? 0.65 : 0.9} className="transition-all duration-150" /></g>; })}
      {hoverIndex !== null && points[hoverIndex] && <g transform={`translate(${getCX(points[hoverIndex].x)}, ${getCY(points[hoverIndex].y) - 15})`}><rect x="-60" y="-36" width="120" height="30" rx="6" fill="rgba(10,14,26,0.95)" stroke={pointColor} strokeWidth="1" /><text x="0" y="-16" fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">{xLabel}: {points[hoverIndex].x.toFixed(1)} | {yLabel}: {points[hoverIndex].y.toFixed(1)}</text></g>}
    </svg>
  </div>;
}
