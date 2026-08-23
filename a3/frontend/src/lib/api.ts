import {
  UserInfo,
  DatasetInfo,
  AnalyticsData,
  ForecastData,
  AnomaliesData,
  CorrelationData,
  RegressionData,
  GroupByData,
  HypothesisTestData,
  CleanPreviewData,
  CleaningRequest,
  WhatIfData,
  WhatIfRequest,
  AIChatResponse,
  ReportData,
  JsonObject,
} from "./types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("a3_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
      ? Object.fromEntries(options.headers)
      : options.headers ?? {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(endpoint, { ...options, headers });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson: unknown = await res.json();
      if (isRecord(errJson) && typeof errJson.detail === "string") {
        errorDetail = errJson.detail;
      }
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new ApiError(errorDetail, res.status);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const api = {
  async getMe(): Promise<UserInfo> {
    return request<UserInfo>("/api/v1/auth/me");
  },

  async listDatasets(): Promise<DatasetInfo[]> {
    return request<DatasetInfo[]>("/api/v1/datasets");
  },

  async getDataset(id: string): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}`);
  },

  async uploadDataset(file: File): Promise<DatasetInfo> {
    const formData = new FormData();
    formData.append("file", file);
    return request<DatasetInfo>("/api/v1/datasets/upload", { method: "POST", body: formData });
  },

  async createSampleDataset(sampleType: string): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/sample/${sampleType}`, { method: "POST" });
  },

  async deleteDataset(id: string): Promise<void> {
    return request<void>(`/api/v1/datasets/${id}`, { method: "DELETE" });
  },

  async renameDataset(id: string, name: string, description?: string): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
    });
  },

  async duplicateDataset(id: string): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}/duplicate`, { method: "POST" });
  },

  async getDatasetData(
    id: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    columns: string[];
    rows: JsonObject[];
    total_rows: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    return request(`/api/v1/datasets/${id}/data?page=${page}&page_size=${pageSize}`);
  },

  async getAnalytics(id: string): Promise<AnalyticsData> {
    return request<AnalyticsData>(`/api/v1/datasets/${id}/analytics`);
  },

  async getCorrelations(id: string): Promise<CorrelationData> {
    return request<CorrelationData>(`/api/v1/datasets/${id}/correlations`);
  },

  async getRegression(id: string, feature: string, target: string): Promise<RegressionData> {
    return request<RegressionData>(
      `/api/v1/datasets/${id}/regression?feature=${encodeURIComponent(feature)}&target=${encodeURIComponent(target)}`
    );
  },

  async getGroupBy(id: string, groupCol: string, metricCols: string[]): Promise<GroupByData> {
    const params = new URLSearchParams({ group_col: groupCol });
    metricCols.forEach((m) => params.append("metric_cols", m));
    return request<GroupByData>(`/api/v1/datasets/${id}/groupby?${params.toString()}`);
  },

  async getHypothesisTest(
    id: string,
    req: {
      group_column: string;
      segment_a: string;
      segment_b: string;
      metric_column: string;
      confidence_level?: number;
    }
  ): Promise<HypothesisTestData> {
    return request<HypothesisTestData>(`/api/v1/datasets/${id}/hypothesis`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  async previewClean(id: string, req: CleaningRequest): Promise<CleanPreviewData> {
    return request<CleanPreviewData>(`/api/v1/datasets/${id}/clean/preview`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  async applyClean(id: string, req: CleaningRequest): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}/clean`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  async getForecast(
    id: string,
    metric: string,
    dimension?: string,
    horizon: number = 30,
    model: string = "linear",
    confidence: number = 0.95
  ): Promise<ForecastData> {
    let url = `/api/v1/datasets/${id}/forecast?horizon=${horizon}&metric=${encodeURIComponent(
      metric
    )}&model_type=${encodeURIComponent(model)}&confidence=${confidence}`;
    if (dimension) url += `&dimension=${encodeURIComponent(dimension)}`;
    return request<ForecastData>(url);
  },

  async getAnomalies(
    id: string,
    threshold: number = 2.0,
    method: string = "z_score"
  ): Promise<AnomaliesData> {
    return request<AnomaliesData>(
      `/api/v1/datasets/${id}/anomalies?threshold=${threshold}&method=${encodeURIComponent(method)}`
    );
  },

  async simulateWhatIf(id: string, req: WhatIfRequest): Promise<WhatIfData> {
    return request<WhatIfData>(`/api/v1/datasets/${id}/whatif`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  },

  async sendAIChat(message: string, datasetId?: string): Promise<AIChatResponse> {
    return request<AIChatResponse>("/api/v1/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, dataset_id: datasetId }),
    });
  },

  async generateReport(id: string, title?: string, horizon: number = 30): Promise<ReportData> {
    return request<ReportData>("/api/v1/reports/generate", {
      method: "POST",
      body: JSON.stringify({ dataset_id: id, title, forecast_horizon: horizon }),
    });
  },
};
