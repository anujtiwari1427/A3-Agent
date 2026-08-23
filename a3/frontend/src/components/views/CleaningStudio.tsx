"use client";

import React, { useState } from "react";
import { DatasetInfo, CleanPreviewData } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { useToast } from "../layout/Toast";

interface CleaningStudioProps {
  dataset: DatasetInfo | null;
  onCleaningApplied: (newDatasetId: string) => void;
}

export function CleaningStudio({ dataset, onCleaningApplied }: CleaningStudioProps) {
  const toast = useToast();

  // Cleaning strategy state
  const [dropDuplicates, setDropDuplicates] = useState(true);
  const [imputeNumeric, setImputeNumeric] = useState<"mean" | "median" | "zero" | "drop" | "none">("mean");
  const [imputeCategorical, setImputeCategorical] = useState<"mode" | "placeholder" | "drop" | "none">("mode");
  const [customPlaceholder, setCustomPlaceholder] = useState("Unknown");
  const [outlierHandling, setOutlierHandling] = useState<"none" | "clip" | "drop">("clip");
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [caseNormalization, setCaseNormalization] = useState<"none" | "lower" | "upper" | "title">("none");
  const [normalizeDates, setNormalizeDates] = useState(true);
  const [createNewVersion, setCreateNewVersion] = useState(false);

  // Column renaming & drop state
  const [renames, setRenames] = useState<Array<{ old_name: string; new_name: string }>>([]);
  const [selectedDropCols, setSelectedDropCols] = useState<string[]>([]);
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);

  // Preview diff state
  const [previewData, setPreviewData] = useState<CleanPreviewData | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<"cleaned" | "original">("cleaned");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to clean.</div>;
  }

  function handleAddRename(colName: string, newName: string) {
    setRenames((prev) => {
      const filtered = prev.filter((r) => r.old_name !== colName);
      if (!newName.trim() || newName === colName) return filtered;
      return [...filtered, { old_name: colName, new_name: newName.trim() }];
    });
  }

  function toggleDropCol(colName: string) {
    setSelectedDropCols((prev) =>
      prev.includes(colName) ? prev.filter((c) => c !== colName) : [...prev, colName]
    );
  }

  async function handleGeneratePreview() {
    setIsPreviewLoading(true);
    try {
      const res = await api.previewClean(dataset!.id, {
        drop_duplicates: dropDuplicates,
        impute_numeric: imputeNumeric,
        impute_categorical: imputeCategorical,
        custom_null_placeholder: customPlaceholder,
        outlier_handling: outlierHandling,
        trim_whitespace: trimWhitespace,
        case_normalization: caseNormalization,
        normalize_dates: normalizeDates,
        rename_columns: renames.length > 0 ? renames : undefined,
        drop_columns: selectedDropCols.length > 0 ? selectedDropCols : undefined,
        standardize_text: true,
      });
      setPreviewData(res);
      toast.info("Generated clean preview diff");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate preview";
      toast.error(message);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleApplyClean() {
    setIsApplying(true);
    try {
      const res = await api.applyClean(dataset!.id, {
        drop_duplicates: dropDuplicates,
        impute_numeric: imputeNumeric,
        impute_categorical: imputeCategorical,
        custom_null_placeholder: customPlaceholder,
        outlier_handling: outlierHandling,
        trim_whitespace: trimWhitespace,
        case_normalization: caseNormalization,
        normalize_dates: normalizeDates,
        rename_columns: renames.length > 0 ? renames : undefined,
        drop_columns: selectedDropCols.length > 0 ? selectedDropCols : undefined,
        create_new_version: createNewVersion,
        standardize_text: true,
      });
      toast.success(
        createNewVersion
          ? `Created cleaned derivative dataset "${res.name}"`
          : `Cleaned "${res.name}" non-destructively (Raw file backed up)`
      );
      onCleaningApplied(res.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to apply clean routine";
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Data Cleaning Studio</span>
            <Badge variant="emerald">Non-Destructive</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Configure transformation rules, simulate changes in a live preview diff, and apply clean operations without destroying original raw data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGeneratePreview} loading={isPreviewLoading}>
            👁 Preview Changes Diff
          </Button>
          <Button variant="primary" size="sm" onClick={handleApplyClean} loading={isApplying}>
            ✓ Apply Transformations
          </Button>
        </div>
      </div>

      {/* Configuration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Setup */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
              Transformation Rules
            </h3>
            <button
              onClick={() => setShowAdvancedColumns(!showAdvancedColumns)}
              className="text-[11px] text-[var(--accent-emerald)] hover:underline cursor-pointer"
            >
              {showAdvancedColumns ? "Hide Column Tools" : "Rename / Drop Columns →"}
            </button>
          </div>

          {/* Advanced Column Renaming & Drop Manager */}
          {showAdvancedColumns && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <span className="text-xs font-semibold text-white block">Column Renaming & Selection</span>
              <p className="text-[11px] text-gray-400">
                Rename columns or select unwanted columns to drop from the cleaned dataset.
              </p>
              {previewData?.preview_columns ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {previewData.preview_columns.map((col) => {
                    const isDropped = selectedDropCols.includes(col);
                    const currentRename = renames.find((r) => r.old_name === col)?.new_name || "";
                    return (
                      <div key={col} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={isDropped}
                          onChange={() => toggleDropCol(col)}
                          title="Drop column"
                          className="w-3.5 h-3.5 accent-red-400 cursor-pointer"
                        />
                        <span className={`font-mono truncate w-24 ${isDropped ? "line-through text-gray-500" : "text-gray-200"}`}>
                          {col}
                        </span>
                        <input
                          type="text"
                          disabled={isDropped}
                          defaultValue={currentRename}
                          placeholder="New name…"
                          onBlur={(e) => handleAddRename(col, e.target.value)}
                          className="flex-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white disabled:opacity-30"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-[11px] text-gray-500 italic block">
                  Click &apos;Preview Changes Diff&apos; to load schema columns.
                </span>
              )}
            </div>
          )}

          {/* Duplicates */}
          <div className="space-y-1">
            <label className="flex items-center justify-between text-xs text-gray-200 cursor-pointer">
              <span>Drop Exact Duplicate Records</span>
              <input
                type="checkbox"
                checked={dropDuplicates}
                onChange={(e) => setDropDuplicates(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent-emerald)] cursor-pointer"
              />
            </label>
            <p className="text-[11px] text-[var(--text-muted)]">Removes identical rows based on all attribute signatures.</p>
          </div>

          {/* Numeric Nulls */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Numeric Null Imputation</label>
            <select
              value={imputeNumeric}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setImputeNumeric(e.target.value as "mean" | "median" | "zero" | "drop" | "none")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
            >
              <option value="mean" className="bg-[#0b0f19]">Fill with Column Mean (Recommended)</option>
              <option value="median" className="bg-[#0b0f19]">Fill with Column Median</option>
              <option value="zero" className="bg-[#0b0f19]">Fill with Constant 0.0</option>
              <option value="drop" className="bg-[#0b0f19]">Drop Rows with Nulls</option>
              <option value="none" className="bg-[#0b0f19]">Keep Untouched (None)</option>
            </select>
          </div>

          {/* Categorical Nulls */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Categorical Null Imputation</label>
            <select
              value={imputeCategorical}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setImputeCategorical(e.target.value as "mode" | "placeholder" | "drop" | "none")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
            >
              <option value="mode" className="bg-[#0b0f19]">Fill with Most Frequent (Mode)</option>
              <option value="placeholder" className="bg-[#0b0f19]">Fill with Custom Placeholder</option>
              <option value="drop" className="bg-[#0b0f19]">Drop Rows with Nulls</option>
              <option value="none" className="bg-[#0b0f19]">Keep Untouched (None)</option>
            </select>
            {imputeCategorical === "placeholder" && (
              <input
                type="text"
                value={customPlaceholder}
                onChange={(e) => setCustomPlaceholder(e.target.value)}
                placeholder="Placeholder string (e.g. Unknown)"
                className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white"
              />
            )}
          </div>

          {/* Outliers */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-200 block">Statistical Outlier Handling (Z-Score &gt; 3.0)</label>
            <select
              value={outlierHandling}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOutlierHandling(e.target.value as "none" | "clip" | "drop")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
            >
              <option value="clip" className="bg-[#0b0f19]">Winsorize / Clip to ±3.0 StdDev boundary</option>
              <option value="drop" className="bg-[#0b0f19]">Drop Outlier Rows entirely</option>
              <option value="none" className="bg-[#0b0f19]">Retain Outliers (None)</option>
            </select>
          </div>

          {/* Text Hygiene & Dates */}
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <label className="flex items-center justify-between text-xs text-gray-200 cursor-pointer">
              <span>Trim Whitespace</span>
              <input
                type="checkbox"
                checked={trimWhitespace}
                onChange={(e) => setTrimWhitespace(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent-emerald)] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-gray-200 cursor-pointer">
              <span>Normalize Date Strings to YYYY-MM-DD</span>
              <input
                type="checkbox"
                checked={normalizeDates}
                onChange={(e) => setNormalizeDates(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent-emerald)] cursor-pointer"
              />
            </label>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-200 block">String Case Normalization</label>
              <select
                value={caseNormalization}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCaseNormalization(e.target.value as "none" | "lower" | "upper" | "title")}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--accent-emerald)]"
              >
                <option value="none" className="bg-[#0b0f19]">Preserve Existing Casing</option>
                <option value="lower" className="bg-[#0b0f19]">lowercase (e.g. &apos;john doe&apos;)</option>
                <option value="upper" className="bg-[#0b0f19]">UPPERCASE (e.g. &apos;JOHN DOE&apos;)</option>
                <option value="title" className="bg-[#0b0f19]">Title Case (e.g. &apos;John Doe&apos;)</option>
              </select>
            </div>
          </div>

          {/* Version option */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <label className="flex items-center justify-between text-xs text-white font-medium cursor-pointer">
              <span>Save As New Derivative Dataset</span>
              <input
                type="checkbox"
                checked={createNewVersion}
                onChange={(e) => setCreateNewVersion(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent-emerald)] cursor-pointer"
              />
            </label>
            <p className="text-[10px] text-gray-400 mt-1">
              If enabled, creates `Cleaned_{dataset.name}` while keeping current record unaltered.
            </p>
          </div>
        </Card>

        {/* Live Preview Diff Box */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white">Transformation Impact Preview</h3>
              <p className="text-xs text-[var(--text-muted)]">Inspect before/after modifications prior to committing.</p>
            </div>
            {previewData && (
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 text-[11px]">
                  <button
                    onClick={() => setDiffViewMode("cleaned")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      diffViewMode === "cleaned" ? "bg-[var(--accent-emerald)] text-black font-semibold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Cleaned View
                  </button>
                  <button
                    onClick={() => setDiffViewMode("original")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      diffViewMode === "original" ? "bg-white/15 text-white font-semibold" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Original View
                  </button>
                </div>
                <Badge variant="emerald">
                  {previewData.original_row_count} → {previewData.cleaned_row_count} rows
                </Badge>
              </div>
            )}
          </div>

          {previewData ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 block uppercase">Duplicates Dropped</span>
                  <span className="text-base font-bold font-mono text-amber-400">{previewData.removed_duplicates}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 block uppercase">Nulls Imputed</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{previewData.imputed_nulls}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-gray-400 block uppercase">Outliers Handled</span>
                  <span className="text-base font-bold font-mono text-blue-400">{previewData.handled_outliers}</span>
                </div>
              </div>

              {/* Changes Summary Pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-300">Audited Changes:</span>
                <ul className="space-y-1 text-xs text-gray-300">
                  {previewData.changes_summary.map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cleaned Rows Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300">
                    {diffViewMode === "cleaned" ? "Cleaned Output Sample Rows:" : "Original Pre-Clean Sample Rows:"}
                  </span>
                  <span className="text-gray-500 font-mono text-[11px]">First 6 rows</span>
                </div>

                <div className="overflow-x-auto max-h-64 border border-white/5 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0b0f19] border-b border-white/10 sticky top-0">
                      <tr>
                        {previewData.preview_columns.map((col) => (
                          <th key={col} className="p-2.5 font-medium text-white whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(diffViewMode === "cleaned"
                        ? previewData.preview_cleaned_rows
                        : previewData.preview_original_rows
                      ).slice(0, 6).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          {previewData.preview_columns.map((col) => {
                            const val = row[col];
                            return (
                              <td key={col} className="p-2 text-gray-300 font-mono text-[11px] whitespace-nowrap">
                                {val !== undefined && val !== null && val !== "" ? (
                                  String(val)
                                ) : (
                                  <span className="text-gray-600 italic">null</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-gray-500 space-y-3">
              <span className="text-3xl block">✨</span>
              <p>Configure your cleaning rules on the left and click &quot;Preview Changes Diff&quot; to simulate transformations.</p>
              <Button variant="outline" size="sm" onClick={handleGeneratePreview} loading={isPreviewLoading}>
                Generate Preview Now
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
