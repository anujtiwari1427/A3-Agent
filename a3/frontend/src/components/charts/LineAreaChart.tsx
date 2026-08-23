"use client";

import React, { useId, useState } from "react";

interface LineAreaChartProps {
  labels: string[];
  values: number[];
  height?: number;
  color?: "emerald" | "blue" | "purple" | "amber";
  isArea?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  title?: string;
}

export function LineAreaChart({
  labels,
  values,
  height = 280,
  color = "emerald",
  isArea = true,
  valuePrefix = "",
  valueSuffix = "",
  title,
}: LineAreaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");

  if (!values || values.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">
        No numeric series data to plot.
      </div>
    );
  }

  const padding = { top: 25, right: 25, bottom: 35, left: 50 };
  const width = 680;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);
  const valRange = maxVal - minVal || 1;
  const getX = (i: number) => padding.left + (i / (values.length - 1 || 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - ((v - minVal) / valRange) * chartH;
  const points = values.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");
  const areaPath = `M ${getX(0)},${padding.top + chartH} L ${points} L ${getX(values.length - 1)},${padding.top + chartH} Z`;

  let strokeColor = "#34d399";
  let gradFrom = "rgba(52, 211, 153, 0.35)";
  let gradTo = "rgba(52, 211, 153, 0.0)";
  if (color === "blue") {
    strokeColor = "#60a5fa";
    gradFrom = "rgba(96, 165, 250, 0.35)";
    gradTo = "rgba(96, 165, 250, 0.0)";
  } else if (color === "purple") {
    strokeColor = "#a78bfa";
    gradFrom = "rgba(167, 139, 250, 0.35)";
    gradTo = "rgba(167, 139, 250, 0.0)";
  } else if (color === "amber") {
    strokeColor = "#fbbf24";
    gradFrom = "rgba(251, 191, 36, 0.35)";
    gradTo = "rgba(251, 191, 36, 0.0)";
  }

  return (
    <div className="relative w-full overflow-hidden">
      {title && <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span></div>}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradFrom} /><stop offset="100%" stopColor={gradTo} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          const val = minVal + valRange * pct;
          return <g key={i}><line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" /><text x={padding.left - 8} y={y + 3} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="monospace">{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}</text></g>;
        })}
        {isArea && <path d={areaPath} fill={`url(#${gradientId})`} />}
        <polyline fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {values.map((v, i) => {
          const cx = getX(i); const cy = getY(v); const isHovered = hoverIndex === i;
          return <g key={i}>
            <circle cx={cx} cy={cy} r="14" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} />
            <circle cx={cx} cy={cy} r={isHovered ? "6" : "3.5"} fill={isHovered ? "#fff" : strokeColor} stroke={isHovered ? strokeColor : "#06080f"} strokeWidth="2" className="transition-all duration-200 pointer-events-none" />
            {labels[i] && (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) && <text x={cx} y={padding.top + chartH + 18} fill="rgba(255,255,255,0.45)" fontSize="10" textAnchor="middle">{labels[i].length > 10 ? `${labels[i].substring(0, 8)}…` : labels[i]}</text>}
          </g>;
        })}
        {hoverIndex !== null && values[hoverIndex] !== undefined && <g transform={`translate(${getX(hoverIndex)}, ${getY(values[hoverIndex])})`}>
          <line x1="0" y1={-getY(values[hoverIndex]) + padding.top} x2="0" y2={padding.top + chartH - getY(values[hoverIndex])} stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
          <rect x="-45" y="-38" width="90" height="30" rx="6" fill="rgba(10,14,26,0.95)" stroke={strokeColor} strokeWidth="1" />
          <text x="0" y="-24" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">{valuePrefix}{values[hoverIndex].toLocaleString()}{valueSuffix}</text>
          <text x="0" y="-12" fill="rgba(255,255,255,0.6)" fontSize="8" textAnchor="middle">{labels[hoverIndex] || `Point ${hoverIndex + 1}`}</text>
        </g>}
      </svg>
    </div>
  );
}
