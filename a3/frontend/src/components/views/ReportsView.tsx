"use client";

import React, { useState } from "react";
import { DatasetInfo, ReportData } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";
import { exportToMarkdown, exportToJSON } from "../../lib/exportUtils";
import { useToast } from "../layout/Toast";

interface ReportsViewProps {
  dataset: DatasetInfo | null;
}

export function ReportsView({ dataset }: ReportsViewProps) {
  const toast = useToast();
  const [reportTitle, setReportTitle] = useState<string>("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  if (!dataset) {
    return <div className="p-12 text-center text-xs text-gray-500">Please select a dataset to compile an executive briefing.</div>;
  }

  async function handleGenerateReport() {
    setLoading(true);
    try {
      const res = await api.generateReport(dataset!.id, reportTitle || undefined);
      setReport(res);
      toast.success("Executive Strategic Report compiled successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate executive report");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print-hide">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Executive Strategic Report Suite</span>
            <Badge variant="emerald">Print & PDF Ready</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Auto-generate comprehensive executive briefings with KPIs, data health audits, anomalies, and AI recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report ? (
            <>
              <Button variant="outline" size="sm" onClick={() => exportToMarkdown(report.markdown_content, `${report.title}.md`)}>
                ↓ Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToJSON(report.json_structure, `${report.title}.json`)}>
                ↓ JSON
              </Button>
              <Button variant="primary" size="sm" onClick={handlePrint}>
                🖨 Print / PDF
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={handleGenerateReport} loading={loading}>
              ⚡ Compile Executive Briefing
            </Button>
          )}
        </div>
      </div>

      {/* Generated Executive Report Document View */}
      {report ? (
        <Card className="p-8 space-y-6 bg-[rgba(10,14,24,0.95)] border border-white/10 max-w-4xl mx-auto shadow-2xl printable-document">
          {/* Title and Metadata Header */}
          <div className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[var(--accent-emerald)]">
                A3 Intelligence Platform • Executive Briefing
              </span>
              <Badge variant="emerald">Quality Index: {report.data_quality_score}/100</Badge>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2 mb-1">{report.title}</h1>
            <p className="text-xs text-gray-400 font-mono">
              Generated: {report.generated_at} • Target Dataset: {report.dataset_name} ({report.total_records.toLocaleString()} records, {report.total_columns} attributes)
            </p>
          </div>

          {/* Executive Summary */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Executive Summary</h3>
            <p className="text-xs text-gray-200 leading-relaxed">{report.executive_summary}</p>
          </div>

          {/* Report Sections */}
          <div className="space-y-6">
            {report.sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-sm font-bold text-white tracking-wide border-b border-white/5 pb-1">
                  {sec.heading}
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">{sec.content}</p>
                {sec.highlights && sec.highlights.length > 0 && (
                  <ul className="space-y-1.5 mt-2 bg-white/[0.01] p-3 rounded-xl border border-white/5">
                    {sec.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-200">
                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Signature & Disclaimer Footer */}
          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span>A3 Analytics Engine • Local Confidential Execution</span>
            <span>Page 1 of 1</span>
          </div>
        </Card>
      ) : (
        <Card className="py-16 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl text-emerald-400 mx-auto">
            📄
          </div>
          <h3 className="text-base font-semibold text-white">Generate Strategic Executive Briefing</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Click below to automatically compile all statistical distributions, anomalies, correlations, forecasts, and AI recommendations into a publication-grade executive summary.
          </p>
          <Button variant="primary" size="md" onClick={handleGenerateReport} loading={loading}>
            Compile Report Now
          </Button>
        </Card>
      )}
    </div>
  );
}
