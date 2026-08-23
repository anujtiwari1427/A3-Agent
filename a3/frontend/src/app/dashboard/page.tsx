"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ViewType, DatasetInfo, UserInfo, AnalyticsData } from "../../lib/types";
import { api } from "../../lib/api";
import { useToast } from "../../components/layout/Toast";
import { Sidebar } from "../../components/layout/Sidebar";
import { Header } from "../../components/layout/Header";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

// Feature Views
import { OverviewView } from "../../components/views/OverviewView";
import { DatasetsView } from "../../components/views/DatasetsView";
import { ProfileView } from "../../components/views/ProfileView";
import { CleaningStudio } from "../../components/views/CleaningStudio";
import { AnalyticsStudio } from "../../components/views/AnalyticsStudio";
import { GraphStudio } from "../../components/views/GraphStudio";
import { ForecastingView } from "../../components/views/ForecastingView";
import { AnomalyView } from "../../components/views/AnomalyView";
import { WhatIfView } from "../../components/views/WhatIfView";
import { AICopilotView } from "../../components/views/AICopilotView";
import { ReportsView } from "../../components/views/ReportsView";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App Controller State
  const [user, setUser] = useState<UserInfo | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>("overview");
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loadedAnalyticsId, setLoadedAnalyticsId] = useState<string>("");
  const loadingAnalytics = Boolean(selectedDatasetId) && loadedAnalyticsId !== selectedDatasetId;

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const loadDatasetsList = useCallback(async (targetSelectId?: string) => {
    try {
      const list = await api.listDatasets();
      setDatasets(list);

      if (list.length > 0) {
        setSelectedDatasetId((prevSelected) => {
          if (targetSelectId) return targetSelectId;
          if (prevSelected && list.some((d) => d.id === prevSelected)) return prevSelected;
          return list[0].id;
        });
      } else {
        setSelectedDatasetId("");
        setAnalytics(null);
      }
    } catch {
      toast.error("Failed to retrieve dataset records.");
    }
  }, [toast]);

  // 1. Initial Authentication and Datasets Loading
  useEffect(() => {
    const token = localStorage.getItem("a3_token");
    if (!token) {
      router.push("/");
      return;
    }

    api
      .getMe()
      .then((userData) => {
        setUser(userData);
        loadDatasetsList();
      })
      .catch(() => {
        localStorage.removeItem("a3_token");
        localStorage.removeItem("a3_user");
        router.push("/");
      });
  }, [loadDatasetsList, router]);

  // 2. Load statistical profile when active dataset changes
  useEffect(() => {
    if (!selectedDatasetId) {
      return;
    }

    let isMounted = true;
    api
      .getAnalytics(selectedDatasetId)
      .then((data) => {
        if (isMounted) {
          setAnalytics(data);
          setLoadedAnalyticsId(selectedDatasetId);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadedAnalyticsId(selectedDatasetId);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDatasetId]);

  // Handle Logout with complete privacy and cache clearing
  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    setDatasets([]);
    setSelectedDatasetId("");
    setAnalytics(null);
    router.push("/");
  }

  // Handle 1-Click Sample Dataset Injection
  async function handleLoadSample(type: string) {
    setIsLoadingSample(true);
    try {
      const newDataset = await api.createSampleDataset(type);
      toast.success(`Injected sample dataset: ${newDataset.name}`);
      await loadDatasetsList(newDataset.id);
      setCurrentView("overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to inject sample dataset";
      toast.error(msg);
    } finally {
      setIsLoadingSample(false);
    }
  }

  // Handle Upload
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const newDataset = await api.uploadDataset(selectedFile);
      toast.success(`Uploaded ${newDataset.name} successfully!`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      await loadDatasetsList(newDataset.id);
      setCurrentView("overview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId) || null;

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        datasetSelected={Boolean(selectedDatasetId)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          user={user}
          datasets={datasets}
          selectedDatasetId={selectedDatasetId}
          onSelectDataset={setSelectedDatasetId}
          onUploadClick={() => setUploadModalOpen(true)}
          onSampleClick={handleLoadSample}
          onLogout={handleLogout}
          isLoadingSample={isLoadingSample}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {currentView === "overview" && (
            <OverviewView
              dataset={selectedDataset}
              analytics={analytics}
              loading={loadingAnalytics}
              onNavigate={setCurrentView}
              onLoadSample={handleLoadSample}
            />
          )}

          {currentView === "datasets" && (
            <DatasetsView
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={setSelectedDatasetId}
              onRefreshDatasets={loadDatasetsList}
              onUploadClick={() => setUploadModalOpen(true)}
            />
          )}

          {currentView === "profile" && (
            <ProfileView
              dataset={selectedDataset}
              analytics={analytics}
              loading={loadingAnalytics}
            />
          )}

          {currentView === "cleaning" && (
            <CleaningStudio
              dataset={selectedDataset}
              onCleaningApplied={(newId) => loadDatasetsList(newId)}
            />
          )}

          {currentView === "analytics" && (
            <AnalyticsStudio
              dataset={selectedDataset}
              analytics={analytics}
            />
          )}

          {currentView === "graph-studio" && (
            <GraphStudio
              dataset={selectedDataset}
              analytics={analytics}
            />
          )}

          {currentView === "forecasting" && (
            <ForecastingView
              dataset={selectedDataset}
              analytics={analytics}
            />
          )}

          {currentView === "anomalies" && (
            <AnomalyView dataset={selectedDataset} />
          )}

          {currentView === "whatif" && (
            <WhatIfView
              dataset={selectedDataset}
              analytics={analytics}
            />
          )}

          {currentView === "copilot" && (
            <AICopilotView
              dataset={selectedDataset}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === "reports" && (
            <ReportsView dataset={selectedDataset} />
          )}
        </main>
      </div>

      {/* Upload File Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Dataset (CSV / JSON)"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center hover:border-[var(--accent-emerald)] transition-colors cursor-pointer bg-white/[0.01]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,.txt,.tsv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mx-auto mb-3">
              📁
            </div>
            <p className="text-xs font-semibold text-white">
              {selectedFile ? selectedFile.name : "Click to select or drag and drop a file"}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Supports CSV, JSON, TSV format up to 25MB
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedFile || isUploading}
              loading={isUploading}
            >
              Start Ingestion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
