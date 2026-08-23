"use client";

import React, { useState } from "react";

interface DonutSlice {
  label: string;
  value: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  innerRadiusRatio?: number;
  isPie?: boolean;
  title?: string;
}

const PALETTE = ["#34d399", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171", "#38bdf8", "#c084fc", "#4ade80", "#818cf8"];

export function DonutChart({
  data,
  size = 260,
  innerRadiusRatio = 0.62,
  isPie = false,
  title,
}: DonutChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">No slice data.</div>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const radius = size / 2 - 10;
  const center = size / 2;
  const innerRadius = isPie ? 0.01 : radius * innerRadiusRatio;

  interface CalculatedSlice extends DonutSlice {
    pathData: string;
    color: string;
    pct: string;
    index: number;
    endAngle: number;
  }

  const calculatedSlices = data.reduce<CalculatedSlice[]>((result, item, index) => {
    const startAngle = result.length === 0 ? 0 : result[result.length - 1].endAngle;
    const sliceAngle = (item.value / total) * 360;
    const endAngle = startAngle + sliceAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const ix1 = center + innerRadius * Math.cos(endRad);
    const iy1 = center + innerRadius * Math.sin(endRad);
    const ix2 = center + innerRadius * Math.cos(startRad);
    const iy2 = center + innerRadius * Math.sin(startRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = isPie
      ? `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
      : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    result.push({
      ...item,
      pathData,
      color: PALETTE[index % PALETTE.length],
      pct: ((item.value / total) * 100).toFixed(1),
      index,
      endAngle,
    });
    return result;
  }, []);

  const slices = calculatedSlices;

  return (
    <div className="flex flex-col items-center">
      {title && (
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3">{title}</span>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible select-none">
            {slices.map((s) => {
              const isHover = hoverIndex === s.index;
              return (
                <path
                  key={s.index}
                  d={s.pathData}
                  fill={s.color}
                  opacity={isHover ? 1 : 0.85}
                  stroke="#06080f"
                  strokeWidth={isHover ? "3" : "1.5"}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoverIndex(s.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              );
            })}
          </svg>
          {!isPie && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoverIndex !== null && data[hoverIndex] ? (
                <>
                  <span className="text-sm font-bold text-white truncate max-w-[100px]">{data[hoverIndex].label}</span>
                  <span className="text-xs text-[var(--accent-emerald)] font-mono font-semibold">
                    {((data[hoverIndex].value / total) * 100).toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400">Total</span>
                  <span className="text-sm font-bold text-white font-mono">{total.toLocaleString()}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {slices.map((s) => (
            <div
              key={s.index}
              onMouseEnter={() => setHoverIndex(s.index)}
              onMouseLeave={() => setHoverIndex(null)}
              className={`flex items-center gap-2 text-xs cursor-pointer p-1 rounded-lg transition-colors ${
                hoverIndex === s.index ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-gray-300 truncate max-w-[110px]">{s.label}</span>
              <span className="text-gray-400 font-mono ml-auto">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
