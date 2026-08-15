"use client";

import React, { useState, useEffect } from "react";
import { AnalyticsData, DatasetInfo, WhatIfData } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { LineAreaChart } from "../charts/LineAreaChart";
import { useToast } from "../layout/Toast";

interface WhatIfViewProps {
  dataset: DatasetInfo | null;
  analytics: AnalyticsData | null;
}

export function WhatIfView({ dataset, analytics }: WhatIfViewProps) {
  const toast = useToast();

  const [targetMetric, setTargetMetric] = useState<string>("");
  const [driverVar1, setDriverVar1] = useState<string>("");
  const [driverPct1, setDriverPct1] = useState<number>(10);
  const [driverVar2, setDriverVar2] = useState<string>("");
  const [driverPct2, setDriverPct2] = useState<number>(0);

  const [simulation, setSimulation] = useState<WhatIfData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const numCols = analytics?.columns?.filter((c) => c.type === "numeric") || [];

  useEffect(() => {
    if (numCols.length > 0 && !targetMetric) {
      setTargetMetric(numCols[0].name);
      if (numCols.length > 1) setDriverVar1(numCols[1].name);
      if (numCols.length > 2) setDriverVar2(numCols[2].name);
    }
  }, [analytics]);

  useEffect(() => {
    if (dataset && targetMetric) {
      runSimulation();
    }
  }, [dataset, targetMetric, driverVar1, driverPct1, driverVar2, driverPct2]);

  async function runSimulation() {
    if (!dataset || !targetMetric) return;
    setLoading(true);

    const drivers = [];
    if (driverVar1) drivers.push({ variable_name: driverVar1, percentage_change: driverPct1 });
    if (driverVar2) drivers.push({ variable_name: driverVar2, percentage_change: driverPct2 });

    try {
      const res = await api.simulateWhatIf(dataset.id, {
        target_metric: targetMetric,
        scenario_name: "Strategic Sensitivity Simulation",
        formula_type: "multiplicative",
        driver_variables: drivers,
      });
      setSimulation(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to compute simulation");
    } finally {
      setLoading(false);
    }
  }

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to run What-If simulations.</div>;
  }

  const simPoints = simulation?.simulation_points || [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>What-If Scenario & Sensitivity Simulator</span>
            <Badge variant="blue">Analytical Modeling</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Modify underlying parameter drivers, evaluate outcome sensitivity, and observe projected delta impacts.
          </p>
        </div>
      </div>

      {/* Driver Controls & Target Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="space-y-5">
          <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider pb-2 border-b border-white/10">
            Simulation Drivers
          </h3>

          {/* Target Metric */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Target Metric to Project</label>
            <select
              value={targetMetric}
              onChange={(e) => setTargetMetric(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
            >
              {numCols.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Driver 1 */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-medium">Driver Variable A</span>
              <span className={`font-mono font-bold ${driverPct1 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {driverPct1 >= 0 ? "+" : ""}{driverPct1}%
              </span>
            </div>
            <select
              value={driverVar1}
              onChange={(e) => setDriverVar1(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
            >
              <option value="">-- None --</option>
              {numCols.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={driverPct1}
              onChange={(e) => setDriverPct1(parseInt(e.target.value))}
              className="w-full accent-[var(--accent-emerald)] cursor-pointer mt-1"
            />
          </div>

          {/* Driver 2 */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-medium">Driver Variable B</span>
              <span className={`font-mono font-bold ${driverPct2 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {driverPct2 >= 0 ? "+" : ""}{driverPct2}%
              </span>
            </div>
            <select
              value={driverVar2}
              onChange={(e) => setDriverVar2(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white"
            >
              <option value="">-- None --</option>
              {numCols.map((c) => (
                <option key={c.name} value={c.name} className="bg-[#0b0f19]">
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={driverPct2}
              onChange={(e) => setDriverPct2(parseInt(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDriverPct1(0);
                setDriverPct2(0);
              }}
            >
              Reset Drivers
            </Button>
          </div>
        </Card>

        {/* Simulation Output Scorecard & Chart */}
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Simulated Outcome for {targetMetric}</h3>
            {simulation && (
              <Badge variant={simulation.delta_percentage >= 0 ? "emerald" : "red"}>
                {simulation.delta_percentage >= 0 ? "+" : ""}{simulation.delta_percentage.toFixed(1)}% Projected Impact
              </Badge>
            )}
          </div>

          {simulation && (
            <>
              {/* Scorecard Compare */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Baseline Total</span>
                  <span className="text-xl font-bold font-mono text-gray-300">
                    {simulation.baseline_total.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 block uppercase">Simulated Total</span>
                  <span className="text-xl font-bold font-mono text-emerald-300">
                    {simulation.simulated_total.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-gray-400 block uppercase">Estimated Delta</span>
                  <span
                    className={`text-xl font-bold font-mono ${
                      simulation.delta_value >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {simulation.delta_value >= 0 ? "+" : ""}
                    {simulation.delta_value.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Trajectory comparison chart */}
              {simPoints.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-gray-300">Simulated Trajectory Overlay:</span>
                  <LineAreaChart
                    labels={simPoints.map((p) => p.label)}
                    values={simPoints.map((p) => p.simulated)}
                    height={220}
                    color="blue"
                  />
                </div>
              )}

              {/* Simulation Disclaimer Alert (Mandatory) */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                <span className="text-amber-400 text-sm">⚠</span>
                <span>{simulation.disclaimer}</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
