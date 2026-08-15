"use client";

import React, { useState, useEffect } from "react";
import { DatasetInfo } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { useToast } from "../layout/Toast";
import { exportTableToCSV } from "../../lib/exportUtils";

interface DatasetsViewProps {
  datasets: DatasetInfo[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onRefreshDatasets: (autoSelectId?: string) => void;
  onUploadClick: () => void;
}

export function DatasetsView({
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onRefreshDatasets,
  onUploadClick,
}: DatasetsViewProps) {
  const toast = useToast();
  const [dataGridHeaders, setDataGridHeaders] = useState<string[]>([]);
  const [dataGridRows, setDataGridRows] = useState<Record<string, any>[]>([]);
  const [dataGridTotal, setDataGridTotal] = useState(0);
  const [dataGridPage, setDataGridPage] = useState(1);
  const [dataGridTotalPages, setDataGridTotalPages] = useState(1);
  const [dataGridLoading, setDataGridLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  useEffect(() => {
    if (!selectedDatasetId) return;
    loadGrid(selectedDatasetId, 1);
  }, [selectedDatasetId]);

  async function loadGrid(id: string, page: number) {
    setDataGridLoading(true);
    try {
      const res = await api.getDatasetData(id, page, 50);
      setDataGridHeaders(res.columns);
      setDataGridRows(res.rows);
      setDataGridTotal(res.total_rows);
      setDataGridPage(res.page);
      setDataGridTotalPages(res.total_pages);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tabular grid");
    } finally {
      setDataGridLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete dataset "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      await api.deleteDataset(id);
      toast.success(`Deleted dataset "${name}"`);
      onRefreshDatasets();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete dataset");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDuplicate(id: string) {
    setActionLoadingId(id);
    try {
      const copy = await api.duplicateDataset(id);
      toast.success(`Duplicated dataset as "${copy.name}"`);
      onRefreshDatasets(copy.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate dataset");
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredRows = dataGridRows.filter((row) => {
    if (!searchQuery.trim()) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header & Datasets Management Grid */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Dataset Management & Schema</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Explore stored datasets, inspect columns, duplicate records, or export raw/cleaned tabular data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onUploadClick}>
            + Upload New File
          </Button>
        </div>
      </div>

      {/* Dataset Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((d) => {
          const isSelected = d.id === selectedDatasetId;
          const isLoading = actionLoadingId === d.id;

          return (
            <Card
              key={d.id}
              onClick={() => onSelectDataset(d.id)}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-[var(--accent-emerald)] shadow-[0_0_30px_rgba(52,211,153,0.1)] bg-white/[0.04]"
                  : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="truncate pr-2">
                  <h4 className="text-sm font-semibold text-white truncate">{d.name}</h4>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono tracking-wider">
                    {d.file_type} format
                  </span>
                </div>
                <Badge variant={d.is_cleaned ? "emerald" : "blue"}>
                  {d.is_cleaned ? "Cleaned" : "Original"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3 py-2 border-y border-white/5 text-center">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">Rows</span>
                  <span className="text-xs font-mono font-bold text-white">{d.row_count.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">Cols</span>
                  <span className="text-xs font-mono font-bold text-white">{d.col_count}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block uppercase">Quality</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{d.health_score}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
                  {(d.size_bytes / 1024).toFixed(1)} KB
                </span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDuplicate(d.id)}
                    disabled={isLoading}
                    title="Duplicate dataset"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
                  >
                    ⎘ Copy
                  </button>
                  <a
                    href={`/api/v1/datasets/${d.id}/download`}
                    download
                    title="Download dataset"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs transition-colors cursor-pointer"
                  >
                    ↓ CSV
                  </a>
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    disabled={isLoading}
                    title="Delete dataset"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Dataset Tabular Data Preview */}
      {selectedDataset && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Tabular Data Grid: {selectedDataset.name}</span>
                <Badge variant="neutral">{dataGridTotal.toLocaleString()} total records</Badge>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Showing page {dataGridPage} of {dataGridTotalPages} (50 records per page)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rows…"
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-emerald)]"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportTableToCSV(dataGridHeaders, dataGridRows, `${selectedDataset.name}_export.csv`)}
              >
                Export View
              </Button>
            </div>
          </div>

          {/* Table Container */}
          <div className="w-full overflow-x-auto max-h-[460px] border border-white/5 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b0f19] sticky top-0 z-10 border-b border-white/10">
                <tr>
                  <th className="p-3 font-semibold text-gray-400 w-12 text-center">#</th>
                  {dataGridHeaders.map((h) => (
                    <th key={h} className="p-3 font-semibold text-white whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dataGridLoading ? (
                  <tr>
                    <td colSpan={dataGridHeaders.length + 1} className="p-8 text-center text-gray-500">
                      Loading data grid rows…
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={dataGridHeaders.length + 1} className="p-8 text-center text-gray-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-2.5 text-center text-[var(--text-muted)] font-mono text-[11px]">
                        {(dataGridPage - 1) * 50 + idx + 1}
                      </td>
                      {dataGridHeaders.map((h) => (
                        <td key={h} className="p-2.5 text-gray-300 whitespace-nowrap font-mono text-[11px]">
                          {row[h] !== undefined && row[h] !== null ? String(row[h]) : <span className="text-gray-600">N/A</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              Page {dataGridPage} of {dataGridTotalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={dataGridPage <= 1 || dataGridLoading}
                onClick={() => loadGrid(selectedDataset.id, dataGridPage - 1)}
              >
                ← Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={dataGridPage >= dataGridTotalPages || dataGridLoading}
                onClick={() => loadGrid(selectedDataset.id, dataGridPage + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
