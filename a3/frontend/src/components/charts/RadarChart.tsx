"use client";

import React from "react";

interface RadarItem {
  axis: string;
  value: number;
  max?: number;
}

interface RadarChartProps {
  data: RadarItem[];
  size?: number;
  title?: string;
  color?: "emerald" | "blue" | "purple";
}

export function RadarChart({
  data,
  size = 280,
  title,
  color = "emerald",
}: RadarChartProps) {
  if (!data || data.length < 3) {
    return <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">Radar requires at least 3 axes.</div>;
  }

  const radius = size / 2 - 30;
  const center = size / 2;
  const totalAxes = data.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  const maxVal = Math.max(...data.map((d) => d.max || d.value), 1);

  // Compute vertices for data polygon
  const points = data
    .map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = (Math.min(d.value, maxVal) / maxVal) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");

  let strokeColor = "#34d399";
  let fillColor = "rgba(52, 211, 153, 0.25)";
  if (color === "blue") {
    strokeColor = "#60a5fa";
    fillColor = "rgba(96, 165, 250, 0.25)";
  } else if (color === "purple") {
    strokeColor = "#a78bfa";
    fillColor = "rgba(167, 139, 250, 0.25)";
  }

  return (
    <div className="flex flex-col items-center">
      {title && (
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">{title}</span>
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
        {/* Concentric Web Polygons */}
        {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const webPoints = Array.from({ length: totalAxes })
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = radius * pct;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            })
            .join(" ");
          return (
            <polygon
              key={idx}
              points={webPoints}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        {/* Spoke Axis Lines & Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          const lx = center + (radius + 18) * Math.cos(angle);
          const ly = center + (radius + 18) * Math.sin(angle);

          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <text
                x={lx}
                y={ly + 4}
                fill="rgba(255,255,255,0.65)"
                fontSize="10"
                textAnchor={Math.cos(angle) > 0.3 ? "start" : Math.cos(angle) < -0.3 ? "end" : "middle"}
              >
                {d.axis}
              </text>
            </g>
          );
        })}

        {/* Data Shape */}
        <polygon points={points} fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
      </svg>
    </div>
  );
}
