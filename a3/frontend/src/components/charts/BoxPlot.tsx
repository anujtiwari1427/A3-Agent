"use client";

import React from "react";

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean?: number;
}

interface BoxPlotProps {
  label: string;
  stats: BoxPlotStats;
  height?: number;
  color?: "emerald" | "blue" | "purple";
}

export function BoxPlot({ label, stats, height = 180, color = "emerald" }: BoxPlotProps) {
  const width = 500;
  const padding = { top: 20, right: 30, bottom: 40, left: 30 };
  const chartW = width - padding.left - padding.right;

  const minVal = stats.min;
  const maxVal = stats.max;
  const range = maxVal - minVal || 1;

  const getX = (v: number) => padding.left + ((v - minVal) / range) * chartW;

  const xMin = getX(stats.min);
  const xQ1 = getX(stats.q1);
  const xMed = getX(stats.median);
  const xQ3 = getX(stats.q3);
  const xMax = getX(stats.max);

  let mainColor = "#34d399";
  let boxFill = "rgba(52, 211, 153, 0.2)";
  if (color === "blue") {
    mainColor = "#60a5fa";
    boxFill = "rgba(96, 165, 250, 0.2)";
  } else if (color === "purple") {
    mainColor = "#a78bfa";
    boxFill = "rgba(167, 139, 250, 0.2)";
  }

  const cy = 65;
  const boxH = 45;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="font-semibold text-gray-200">{label}</span>
        <span className="text-[var(--text-muted)] font-mono text-[11px]">IQR: {(stats.q3 - stats.q1).toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
        {/* Whisker line from Min to Max */}
        <line x1={xMin} y1={cy} x2={xMax} y2={cy} stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="3 3" />

        {/* Min tick */}
        <line x1={xMin} y1={cy - 12} x2={xMin} y2={cy + 12} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <text x={xMin} y={cy + 28} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {stats.min.toFixed(1)}
        </text>

        {/* Max tick */}
        <line x1={xMax} y1={cy - 12} x2={xMax} y2={cy + 12} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <text x={xMax} y={cy + 28} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {stats.max.toFixed(1)}
        </text>

        {/* IQR Box (Q1 to Q3) */}
        <rect
          x={xQ1}
          y={cy - boxH / 2}
          width={Math.max(2, xQ3 - xQ1)}
          height={boxH}
          rx="6"
          fill={boxFill}
          stroke={mainColor}
          strokeWidth="2"
        />

        {/* Median line */}
        <line x1={xMed} y1={cy - boxH / 2} x2={xMed} y2={cy + boxH / 2} stroke="#fff" strokeWidth="2.5" />
        <text x={xMed} y={cy - boxH / 2 - 8} fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          Med: {stats.median.toFixed(1)}
        </text>

        {/* Q1 & Q3 text */}
        <text x={xQ1} y={cy + boxH / 2 + 15} fill="rgba(255,255,255,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">
          Q1: {stats.q1.toFixed(1)}
        </text>
        <text x={xQ3} y={cy + boxH / 2 + 15} fill="rgba(255,255,255,0.6)" fontSize="9" textAnchor="middle" fontFamily="monospace">
          Q3: {stats.q3.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
