"use client";

import React, { useState } from "react";

interface BarChartProps {
  labels: string[];
  values: number[];
  height?: number;
  color?: "emerald" | "blue" | "purple" | "amber";
  horizontal?: boolean;
  title?: string;
}

export function BarChart({
  labels,
  values,
  height = 280,
  color = "emerald",
  horizontal = false,
  title,
}: BarChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!values || values.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">
        No bar chart metrics to display.
      </div>
    );
  }

  const width = 680;
  const maxVal = Math.max(...values, 1);

  let barColor = "#34d399";
  let hoverBarColor = "#6ee7b7";
  if (color === "blue") {
    barColor = "#60a5fa";
    hoverBarColor = "#93c5fd";
  } else if (color === "purple") {
    barColor = "#a78bfa";
    hoverBarColor = "#c4b5fd";
  } else if (color === "amber") {
    barColor = "#fbbf24";
    hoverBarColor = "#fde68a";
  }

  if (horizontal) {
    return (
      <div className="w-full overflow-hidden">
        {title && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span>
          </div>
        )}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
          {values.map((v, i) => {
            const pct = Math.max(2, (v / maxVal) * 100);
            const isHover = hoverIndex === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="group cursor-pointer"
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 font-medium truncate max-w-[200px]">{labels[i] || `Item ${i+1}`}</span>
                  <span className="text-white font-mono">{v.toLocaleString()}</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isHover ? hoverBarColor : barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const padding = { top: 25, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const barCount = values.length;
  const barWidth = Math.max(12, Math.min(45, (chartW / barCount) * 0.65));
  const step = chartW / barCount;

  return (
    <div className="relative w-full overflow-hidden">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, i) => {
          const y = padding.top + chartH * (1 - pct);
          const val = maxVal * pct;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {values.map((v, i) => {
          const barH = (v / maxVal) * chartH;
          const x = padding.left + i * step + (step - barWidth) / 2;
          const y = padding.top + chartH - barH;
          const isHover = hoverIndex === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx="4"
                fill={isHover ? hoverBarColor : barColor}
                opacity={isHover ? "1" : "0.85"}
                className="transition-all duration-200"
              />
              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={padding.top + chartH + 16}
                fill={isHover ? "#fff" : "rgba(255,255,255,0.5)"}
                fontSize="9"
                textAnchor="middle"
              >
                {labels[i]?.length > 8 ? `${labels[i].substring(0, 7)}…` : labels[i] || `#${i + 1}`}
              </text>
            </g>
          );
        })}

        {/* Hover Tooltip */}
        {hoverIndex !== null && values[hoverIndex] !== undefined && (
          <g
            transform={`translate(${
              padding.left + hoverIndex * step + step / 2
            }, ${padding.top + chartH - (values[hoverIndex] / maxVal) * chartH - 12})`}
          >
            <rect
              x="-40"
              y="-28"
              width="80"
              height="26"
              rx="6"
              fill="rgba(10,14,26,0.95)"
              stroke={barColor}
              strokeWidth="1"
            />
            <text x="0" y="-11" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">
              {values[hoverIndex].toLocaleString()}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
