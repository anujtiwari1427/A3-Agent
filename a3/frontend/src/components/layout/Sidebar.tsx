"use client";

import React from "react";
import { ViewType } from "../../lib/types";

interface NavItem {
  id: ViewType;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  datasetSelected?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: "◈" },
  { id: "datasets", label: "Datasets & Grid", icon: "📁" },
  { id: "profile", label: "Data Profile", icon: "📊" },
  { id: "cleaning", label: "Cleaning Studio", icon: "✨", badge: "Non-Destructive" },
  { id: "analytics", label: "Analytics Studio", icon: "🔬" },
  { id: "graph-studio", label: "Graph Studio", icon: "📈" },
  { id: "forecasting", label: "Forecasting", icon: "🔮" },
  { id: "anomalies", label: "Anomaly Detection", icon: "⚡" },
  { id: "whatif", label: "What-If Analysis", icon: "🎛️" },
  { id: "copilot", label: "AI Copilot", icon: "🤖" },
  { id: "reports", label: "Executive Reports", icon: "📄" },
];

export function Sidebar({ currentView, onSelectView, datasetSelected }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/5 bg-[rgba(6,8,15,0.85)] backdrop-blur-2xl p-4 select-none z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-emerald)] via-[var(--accent-blue)] to-[var(--accent-purple)] p-[1px]">
          <div className="w-full h-full rounded-[11px] bg-[var(--bg-primary)] flex items-center justify-center font-bold text-[var(--accent-emerald)]">
            ◈
          </div>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            <span>a3</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v2.1
            </span>
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-medium">Intelligence Platform</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="text-[10px] uppercase font-semibold text-[var(--text-muted)] px-3 py-1.5 tracking-wider">
          Workspaces
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 text-left cursor-pointer group ${
                isActive
                  ? "bg-gradient-to-r from-white/10 to-white/5 text-white font-semibold shadow-sm border border-white/10"
                  : "text-[var(--text-secondary)] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`text-sm transition-transform duration-200 ${
                  isActive ? "text-[var(--accent-emerald)] scale-110" : "text-gray-400 group-hover:scale-110"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="pt-3 border-t border-white/5 mt-auto">
        <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${datasetSelected ? "bg-[var(--accent-emerald)]" : "bg-amber-400"} animate-pulse`} />
            <span className="text-gray-300 font-medium">{datasetSelected ? "Dataset Active" : "No Dataset"}</span>
          </div>
          <span className="text-[var(--text-muted)] font-mono text-[10px]">A3 Engine</span>
        </div>
      </div>
    </aside>
  );
}
