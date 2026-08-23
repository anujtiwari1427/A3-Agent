# A3 — Advanced Analytics & Intelligence Platform

> **Modular Data Analytics, Forecasting, Anomaly Detection & AI Copilot Suite**

A3 is a local-first analytics platform built with **FastAPI, SQLAlchemy, Next.js, React and Tailwind CSS**. It combines dataset management, automated profiling, non-destructive cleaning, statistical analytics, forecasting, anomaly detection, What-If simulation, grounded AI reasoning and executive reporting.

## ✨ Why A3

- **Local-first:** SQLite + local analytics + optional Ollama
- **Privacy-focused:** Copilot can reason from computed dataset metadata instead of raw records
- **Modular:** FastAPI routers, repositories, services, schemas and typed frontend API client
- **Analytics-focused:** profiling, correlation, regression, forecasting and anomaly detection
- **Production path:** PostgreSQL, Alembic migrations, secure configuration, container health checks and CI

## 🏗️ Architecture

```text
A3-Agent/
├── a3/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/          # config, auth, database, storage, security
│   │   │   ├── models/        # SQLAlchemy models + indexes
│   │   │   ├── schemas/       # Pydantic DTOs
│   │   │   ├── repositories/  # database access
│   │   │   ├── services/      # analytics and business logic
│   │   │   ├── routers/       # thin REST API modules
│   │   │   └── main.py
│   │   ├── alembic/            # versioned database migrations
│   │   ├── tests/              # automated backend tests
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/app/            # Next.js routes
│       ├── src/components/     # UI, charts and workspace views
│       └── src/lib/            # API client, types and exports
└── .github/workflows/          # CI quality gates
```

## 🚀 Feature Workspaces

| Workspace | Capability |
|---|---|
| Executive Dashboard | KPI cards, data-quality health, primary metrics and summaries |
| Datasets & Grid | Upload, manage, preview and export datasets |
| Data Profile | Five-number summary, dispersion, skewness, missingness and quality audit |
| Cleaning Studio | Preview-first, non-destructive cleaning operations |
| Analytics Studio | Pearson/Spearman correlation, OLS regression and group-by analysis |
| Graph Studio | Line, area, bar, scatter, donut, radar, box plot and heatmap visualizations |
| Forecasting | Trend, exponential-growth and weighted-moving-average forecasting |
| Anomaly Detection | Z-score/IQR detection with severity and row context |
| What-If Analysis | Driver sensitivity and scenario simulation |
| AI Copilot | Grounded analytical reasoning with FACT / OBSERVATION / RECOMMENDATION output |
| Executive Reports | Strategic reports with export-friendly formatting |

## 🛠️ Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Optional: Ollama for local AI Copilot

### Backend

```bash
cd a3/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env.local  # Windows
# cp .env.example .env.local  # macOS/Linux

uvicorn app.main:app --reload --port 8000
```

A local database is initialized automatically for development. The first local admin receives a **random password in the backend startup log** unless `LOCAL_ADMIN_PASSWORD` is explicitly set in `.env.local`.

- API docs: `http://localhost:8000/docs`
- Liveness: `http://localhost:8000/api/v1/health`
- Readiness: `http://localhost:8000/api/v1/ready`

### Frontend

```bash
cd a3/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Cloud database migrations

Production/cloud deployments should use Alembic rather than startup table creation:

```bash
cd a3/backend
alembic upgrade head
```

Set `MODE=cloud`, a PostgreSQL `CLOUD_DATABASE_URL`, a strong `JWT_SECRET`, and explicit `ALLOWED_ORIGINS` before deployment.

## 🔐 Security

- Cloud mode requires an explicit JWT secret of at least 32 characters.
- Local mode generates an ephemeral JWT secret when one is not supplied.
- No hardcoded production admin password is shipped.
- CORS is environment-driven and does not use wildcard origins with credentials.
- Passwords are hashed with bcrypt.
- Uploads are size- and extension-validated.
- Storage paths are resolved and rejected if they escape the configured storage root.
- Dataset access is scoped by organization.
- Production database schema changes are versioned with Alembic.
- The backend container runs as a non-root user and exposes a health check.

## 🧪 Quality Gates

GitHub Actions validates the backend with Python compilation, pytest, clean-database migrations and Alembic checks. Frontend CI validates dependency installation, linting and production builds.

## 🗺️ Roadmap to Production Scale

### Reliability
- [x] Repository/service separation for dataset workflows
- [x] Security-focused configuration and storage validation
- [x] Automated tests and CI
- [x] Alembic migrations
- [x] Health/readiness endpoints
- [ ] Integration and end-to-end browser tests

### Scale
- [ ] Streaming dataset ingestion
- [ ] DuckDB + Parquet analytical engine
- [ ] Managed PostgreSQL deployment
- [ ] S3/Supabase object storage adapter
- [ ] Redis-backed background job queue
- [ ] Distributed caching

### Enterprise
- [ ] Fine-grained RBAC
- [ ] Audit log pipeline
- [ ] API keys and service accounts
- [ ] Usage quotas and billing hooks
- [ ] Team/workspace management
- [ ] SSO/OIDC

### AI
- [ ] Tool-based Copilot analytics execution
- [ ] Evidence-backed insights
- [ ] Automatic dataset diagnosis
- [ ] Natural-language chart generation
- [ ] Scheduled AI executive reports

## 📄 License

MIT License. Built for analytics engineering, Data Science learning, demonstrations and research.
