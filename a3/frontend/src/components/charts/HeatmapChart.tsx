"use client";

import React, { useState } from "react";

interface HeatmapProps {
  columns: string[];
  matrix: Record<string, Record<string, number>>;
  title?: string;
}

export function HeatmapChart({ columns, matrix, title }: HeatmapProps) {
  const [hoverCell, setHoverCell] = useState<{ row: string; col: string; val: number } | null>(null);

  if (!columns || columns.length < 2) {
    return <div className="flex items-center justify-center h-48 text-xs text-[var(--text-muted)]">Need at least 2 numerical features.</div>;
  }

  const getColor = (val: number) => {
    if (val >= 0.7) return "rgba(52, 211, 153, 0.85)"; // Strong positive (emerald)
    if (val >= 0.3) return "rgba(52, 211, 153, 0.45)"; // Moderate positive
    if (val > 0) return "rgba(52, 211, 153, 0.18)"; // Mild positive
    if (val === 0) return "rgba(255, 255, 255, 0.05)";
    if (val > -0.3) return "rgba(248, 113, 113, 0.18)"; // Mild negative
    if (val > -0.7) return "rgba(248, 113, 113, 0.45)"; // Moderate negative
    return "rgba(248, 113, 113, 0.85)"; // Strong negative
  };

  return (
    <div className="w-full overflow-x-auto">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</span>
          <span className="text-[11px] text-[var(--text-muted)]">Pearson Correlation Matrix (-1.0 to +1.0)</span>
        </div>
      )}
      <div className="inline-block min-w-full">
        {/* Header Columns */}
        <div className="flex items-center">
          <div className="w-24 shrink-0" />
          {columns.map((col) => (
            <div key={col} className="w-20 px-1 text-center truncate text-[11px] font-medium text-gray-400">
              {col}
            </div>
          ))}
        </div>

        {/* Matrix Rows */}
        {columns.map((rowCol) => (
          <div key={rowCol} className="flex items-center mt-1">
            <div className="w-24 shrink-0 text-right pr-2 truncate text-[11px] font-medium text-gray-300">
              {rowCol}
            </div>
            {columns.map((targetCol) => {
              const val = matrix[rowCol]?.[targetCol] !== undefined ? matrix[rowCol][targetCol] : 0;
              const isSelf = rowCol === targetCol;
              return (
                <div
                  key={targetCol}
                  onMouseEnter={() => setHoverCell({ row: rowCol, col: targetCol, val })}
                  onMouseLeave={() => setHoverCell(null)}
                  className="w-20 h-11 m-0.5 rounded-lg flex items-center justify-center font-mono text-xs font-semibold cursor-pointer transition-all hover:scale-105 hover:z-10 shadow-sm border border-white/5"
                  style={{
                    backgroundColor: getColor(val),
                    color: Math.abs(val) > 0.4 ? "#fff" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {isSelf ? "1.00" : val.toFixed(2)}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hoverCell && (
        <div className="mt-3 p-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-between">
          <span className="text-gray-300">
            <strong>{hoverCell.row}</strong> & <strong>{hoverCell.col}</strong>
          </span>
          <span className="font-mono text-[var(--accent-emerald)] font-bold">
            r = {hoverCell.val.toFixed(3)}
          </span>
        </div>
      )}
    </div>
  );
}
