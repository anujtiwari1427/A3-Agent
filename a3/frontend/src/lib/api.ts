import {
  UserInfo,
  AuthResponse,
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
  JobInfo,
} from "./types";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("a3_token");
}

function generateRequestId(): string {
  return "req_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : Array.isArray(options.headers)
      ? Object.fromEntries(options.headers)
      : options.headers ?? {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!headers["X-Request-ID"]) headers["X-Request-ID"] = generateRequestId();

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(endpoint, { ...options, headers, signal });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    let errorCode: string | undefined = undefined;
    try {
      const errJson: unknown = await res.json();
      if (isRecord(errJson)) {
        if (typeof errJson.detail === "string") errorDetail = errJson.detail;
        if (typeof errJson.error_code === "string") errorCode = errJson.error_code;
      }
    } catch {
      // Keep fallback
    }
    throw new ApiError(errorDetail, res.status, errorCode);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const api = {
  async verifyLicense(licenseKey: string, signal?: AbortSignal): Promise<{ valid: boolean; message: string }> {
    return request<{ valid: boolean; message: string }>(
      "/api/v1/auth/verify-license",
      {
        method: "POST",
        body: JSON.stringify({ license_key: licenseKey }),
      },
      signal
    );
  },

  async login(email: string, password: string, signal?: AbortSignal): Promise<AuthResponse> {
    return request<AuthResponse>(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      signal
    );
  },

  async register(
    email: string,
    password: string,
    fullName?: string,
    licenseKey?: string,
    signal?: AbortSignal
  ): Promise<AuthResponse> {
    return request<AuthResponse>(
      "/api/v1/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName, license_key: licenseKey }),
      },
      signal
    );
  },

  async getMe(signal?: AbortSignal): Promise<UserInfo> {
    return request<UserInfo>("/api/v1/auth/me", {}, signal);
  },

  async listDatasets(signal?: AbortSignal): Promise<DatasetInfo[]> {
    return request<DatasetInfo[]>("/api/v1/datasets", {}, signal);
  },

  async getDataset(id: string, signal?: AbortSignal): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}`, {}, signal);
  },

  async uploadDataset(file: File, signal?: AbortSignal): Promise<DatasetInfo> {
    const formData = new FormData();
    formData.append("file", file);
    return request<DatasetInfo>("/api/v1/datasets/upload", { method: "POST", body: formData }, signal);
  },

  async createSampleDataset(sampleType: string, signal?: AbortSignal): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/sample/${sampleType}`, { method: "POST" }, signal);
  },

  async deleteDataset(id: string, signal?: AbortSignal): Promise<void> {
    return request<void>(`/api/v1/datasets/${id}`, { method: "DELETE" }, signal);
  },

  async renameDataset(
    id: string,
    name: string,
    description?: string,
    signal?: AbortSignal
  ): Promise<DatasetInfo> {
    return request<DatasetInfo>(
      `/api/v1/datasets/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name, description }),
      },
      signal
    );
  },

  async duplicateDataset(id: string, signal?: AbortSignal): Promise<DatasetInfo> {
    return request<DatasetInfo>(`/api/v1/datasets/${id}/duplicate`, { method: "POST" }, signal);
  },

  async getDatasetData(
    id: string,
    page: number = 1,
    pageSize: number = 50,
    signal?: AbortSignal
  ): Promise<{
    columns: string[];
    rows: JsonObject[];
    total_rows: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    return request(`/api/v1/datasets/${id}/data?page=${page}&page_size=${pageSize}`, {}, signal);
  },

  async getAnalytics(id: string, signal?: AbortSignal): Promise<AnalyticsData> {
    return request<AnalyticsData>(`/api/v1/datasets/${id}/analytics`, {}, signal);
  },

  async getCorrelations(id: string, signal?: AbortSignal): Promise<CorrelationData> {
    return request<CorrelationData>(`/api/v1/datasets/${id}/correlations`, {}, signal);
  },

  async getRegression(
    id: string,
    feature: string,
    target: string,
    signal?: AbortSignal
  ): Promise<RegressionData> {
    return request<RegressionData>(
      `/api/v1/datasets/${id}/regression?feature=${encodeURIComponent(feature)}&target=${encodeURIComponent(target)}`,
      {},
      signal
    );
  },

  async getGroupBy(
    id: string,
    groupCol: string,
    metricCols: string[],
    signal?: AbortSignal
  ): Promise<GroupByData> {
    const params = new URLSearchParams({ group_col: groupCol });
    metricCols.forEach((m) => params.append("metric_cols", m));
    return request<GroupByData>(`/api/v1/datasets/${id}/groupby?${params.toString()}`, {}, signal);
  },

  async getHypothesisTest(
    id: string,
    req: {
      group_column: string;
      segment_a: string;
      segment_b: string;
      metric_column: string;
      confidence_level?: number;
    },
    signal?: AbortSignal
  ): Promise<HypothesisTestData> {
    return request<HypothesisTestData>(
      `/api/v1/datasets/${id}/hypothesis`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      signal
    );
  },

  async previewClean(
    id: string,
    req: CleaningRequest,
    signal?: AbortSignal
  ): Promise<CleanPreviewData> {
    return request<CleanPreviewData>(
      `/api/v1/datasets/${id}/clean/preview`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      signal
    );
  },

  async applyClean(
    id: string,
    req: CleaningRequest,
    signal?: AbortSignal
  ): Promise<DatasetInfo> {
    return request<DatasetInfo>(
      `/api/v1/datasets/${id}/clean`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      signal
    );
  },

  async getForecast(
    id: string,
    metric: string,
    dimension?: string,
    horizon: number = 30,
    model: string = "linear",
    confidence: number = 0.95,
    signal?: AbortSignal
  ): Promise<ForecastData> {
    let url = `/api/v1/datasets/${id}/forecast?horizon=${horizon}&metric=${encodeURIComponent(
      metric
    )}&model_type=${encodeURIComponent(model)}&confidence=${confidence}`;
    if (dimension) url += `&dimension=${encodeURIComponent(dimension)}`;
    return request<ForecastData>(url, {}, signal);
  },

  async getAnomalies(
    id: string,
    threshold: number = 2.0,
    method: string = "z_score",
    signal?: AbortSignal
  ): Promise<AnomaliesData> {
    return request<AnomaliesData>(
      `/api/v1/datasets/${id}/anomalies?threshold=${threshold}&method=${encodeURIComponent(method)}`,
      {},
      signal
    );
  },

  async simulateWhatIf(
    id: string,
    req: WhatIfRequest,
    signal?: AbortSignal
  ): Promise<WhatIfData> {
    return request<WhatIfData>(
      `/api/v1/datasets/${id}/whatif`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
      signal
    );
  },

  async sendAIChat(
    message: string,
    datasetId?: string,
    signal?: AbortSignal
  ): Promise<AIChatResponse> {
    return request<AIChatResponse>(
      "/api/v1/ai/chat",
      {
        method: "POST",
        body: JSON.stringify({ message, dataset_id: datasetId }),
      },
      signal
    );
  },

  async generateReport(
    id: string,
    title?: string,
    horizon: number = 30,
    signal?: AbortSignal
  ): Promise<ReportData> {
    return request<ReportData>(
      "/api/v1/reports/generate",
      {
        method: "POST",
        body: JSON.stringify({ dataset_id: id, title, forecast_horizon: horizon }),
      },
      signal
    );
  },

  async listJobs(page: number = 1, signal?: AbortSignal): Promise<JobInfo[]> {
    return request<JobInfo[]>(`/api/v1/jobs?page=${page}`, {}, signal);
  },

  async getJob(jobId: string, signal?: AbortSignal): Promise<JobInfo> {
    return request<JobInfo>(`/api/v1/jobs/${jobId}`, {}, signal);
  },

  async cancelJob(jobId: string, signal?: AbortSignal): Promise<JobInfo> {
    return request<JobInfo>(`/api/v1/jobs/${jobId}/cancel`, { method: "POST" }, signal);
  },
};
