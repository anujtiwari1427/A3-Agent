# A3-Agent System Architecture

The **A3-Agent Intelligence & Analytics Platform** is a modern, modular SaaS platform for automated tabular data ingestion, profiling, deterministic statistical analytics, anomaly scanning, forward forecasting, what-if sensitivity simulations, executive reporting, and evidence-based AI reasoning.

---

## 1. High-Level Architecture

```
                                  +---------------------------------------+
                                  |         Next.js 16 + React 19         |
                                  |  (Features, Hooks, Typed API Client)  |
                                  +-------------------+-------------------+
                                                      | HTTP / JSON
                                                      v
                                  +---------------------------------------+
                                  |          FastAPI Application          |
                                  |   (Auth, RBAC, RateLimit, Telemetry)  |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
           +---------------------------+                             +---------------------------+
           |     Sync Core Routers     |                             |   Background Job Queue    |
           | (Auth, Datasets, Reports) |                             | (Ingest, Profile, Train)  |
           +-------------+-------------+                             +-------------+-------------+
                         |                                                         |
                         v                                                         v
           +---------------------------+                             +---------------------------+
           |   Service Layer + Tools   |                             |   Analytics & ML Engine   |
           |  (Copilot Tool Registry)  |                             | (DuckDB / Parquet Engine) |
           +-------------+-------------+                             +-------------+-------------+
                         |                                                         |
                         +----------------------------+----------------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
           +---------------------------+                             +---------------------------+
           |   Repository Layer (ORM)  |                             |     Storage Provider      |
           | (User, Org, Dataset, Job) |                             |  (Local / S3 / Supabase)  |
           +-------------+-------------+                             +---------------------------+
                         |
                         v
           +---------------------------+
           |   PostgreSQL / SQLite     |
           |    (Alembic Migrations)   |
           +---------------------------+
```

---

## 2. Component Layers

### 2.1 Frontend Layer (Next.js 16 App Router)
- **UI & Layout**: Modern dark theme glassmorphism design system using TailwindCSS v4 with custom color tokens.
- **Analytical Views**:
  - `OverviewView`: Executive KPI dashboard with data quality metrics and recent activity.
  - `DatasetsView`: Tabular pagination grid, sample loader, and file uploader.
  - `ProfileView`: Deep data profiling, histogram distribution, and health diagnostics.
  - `CleaningStudio`: Non-destructive preview and rule-based data transformation.
  - `AnalyticsStudio`: Multi-variable correlation matrices, regression equations, and Welch's T-Test hypothesis validator.
  - `GraphStudio`: 12 interactive vector SVG charts with AI layout recommendations.
  - `ForecastingView`: Time-series forecasting with historical vs projected curves and confidence intervals.
  - `AnomalyView`: Statistical outlier detector with Z-score and IQR methods.
  - `WhatIfView`: Sensitivity modeling and scenario simulations.
  - `AICopilotView`: Conversational data copilot backed by real computational tools.
  - `ReportsView`: Auto-generated executive intelligence reports with multi-format export.

### 2.2 Backend Layer (FastAPI)
- **Routers**: Thin HTTP controllers performing schema validation and status code formatting.
- **Services**: Pure business logic and mathematical computation engine.
- **Repositories**: Database isolation layer managing ORM queries and multi-tenant scoping.
- **Core**: Configuration, database connection pooling, JWT and API key security, and storage abstractions.

### 2.3 Storage Layer
- **LocalStorageProvider**: Atomic file writes, path traversal verification, and safe directory resolution.
- **SupabaseStorageProvider**: Cloud blob adapter.
