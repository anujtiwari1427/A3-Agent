"use client";

import React, { useState } from "react";
import { DatasetInfo, UserInfo } from "../../lib/types";
import { Button } from "../ui/Button";

interface HeaderProps {
  user: UserInfo | null;
  datasets: DatasetInfo[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onUploadClick: () => void;
  onSampleClick: (type: string) => void;
  onLogout: () => void;
  isLoadingSample?: boolean;
}

export function Header({
  user,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onUploadClick,
  onSampleClick,
  onLogout,
  isLoadingSample = false,
}: HeaderProps) {
  const [sampleDropdownOpen, setSampleDropdownOpen] = useState(false);
  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <header className="h-16 border-b border-white/5 bg-[rgba(6,8,15,0.7)] backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Active Dataset Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Active Dataset:</span>
          {datasets.length > 0 ? (
            <select
              value={selectedDatasetId}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white focus:outline-none focus:border-[var(--accent-emerald)] transition-colors cursor-pointer"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#0b0f19] text-white">
                  {d.name} ({d.row_count.toLocaleString()} rows {d.is_cleaned ? "• Cleaned" : ""})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-[var(--text-muted)] italic">No datasets uploaded yet</span>
          )}
        </div>

        {selectedDataset && (
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono border-l border-white/10 pl-3">
            <span>{selectedDataset.row_count.toLocaleString()} rows</span>
            <span>•</span>
            <span>{selectedDataset.col_count} cols</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{selectedDataset.health_score}% health</span>
          </div>
        )}
      </div>

      {/* Right: Actions, Sample Injector, and Profile */}
      <div className="flex items-center gap-3">
        {/* Sample Datasets Dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSampleDropdownOpen(!sampleDropdownOpen)}
            loading={isLoadingSample}
          >
            <span>⚡ Ingest Sample</span>
            <span className="text-[10px]">▼</span>
          </Button>

          {sampleDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl glass-card bg-[rgba(12,16,28,0.95)] border border-white/10 p-2 shadow-2xl z-50 animate-fade-in-up"
              onMouseLeave={() => setSampleDropdownOpen(false)}
            >
              <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] px-3 py-1 tracking-wider">
                1-Click Demo Datasets
              </div>
              <button
                onClick={() => {
                  onSampleClick("ecommerce");
                  setSampleDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>🛒 Global E-Commerce</span>
                <span className="text-[10px] text-gray-500 font-mono">24 rows</span>
              </button>
              <button
                onClick={() => {
                  onSampleClick("saas");
                  setSampleDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>📈 SaaS MRR & Churn</span>
                <span className="text-[10px] text-gray-500 font-mono">12 rows</span>
              </button>
              <button
                onClick={() => {
                  onSampleClick("fintech");
                  setSampleDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>💳 FinTech Risk Telemetry</span>
                <span className="text-[10px] text-gray-500 font-mono">12 rows</span>
              </button>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <Button variant="primary" size="sm" onClick={onUploadClick}>
          <span>↑ Upload Dataset</span>
        </Button>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400">
            {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "A"}
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs cursor-pointer"
          >
            ↪ Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
