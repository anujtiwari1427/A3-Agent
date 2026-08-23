# A3 — Advanced Analytics & Intelligence Platform

> **Modular Data Analytics, Forecasting, Anomaly Detection & AI Copilot Suite**

A3 is a local-first analytics platform built with **FastAPI, SQLAlchemy, Next.js, React and Tailwind CSS**. It combines dataset management, automated profiling, non-destructive cleaning, statistical analytics, forecasting, anomaly detection, What-If simulation, grounded AI reasoning and executive reporting.

## ✨ Why A3

- **Local-first:** SQLite + local analytics + optional Ollama
- **Privacy-focused:** Copilot can reason from computed dataset metadata instead of raw records
- **Modular:** FastAPI routers, services, schemas and typed frontend API client
- **Analytics-focused:** profiling, correlation, regression, forecasting and anomaly detection
- **Cloud-ready architecture:** PostgreSQL/Supabase configuration is separated from local mode

## 🏗️ Architecture

```text
A3-Agent/
├── a3/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/          # config, auth, database, storage, security
│   │   │   ├── models/        # SQLAlchemy models
│   │   │   ├── schemas/       # Pydantic DTOs
│   │   │   ├── services/      # analytics and business logic
│   │   │   ├── routers/       # REST API modules
│   │   │   └── main.py
│   │   ├── requirements.txt
│   │   └── .env.example
│   └── frontend/
│       ├── src/app/           # Next.js routes
│       ├── src/components/    # UI, charts and workspace views
│       └── src/lib/           # API client, types and exports
├── .github/workflows/ci.yml   # backend + frontend CI
└── README.md
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
```

Copy `.env.example` to `.env.local`, then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

### Frontend

```bash
cd a3/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Local demo login

Local mode creates a demo account on an empty database:

- Username: `admin`
- Password: `admin123`

**Do not expose the local demo configuration to the public internet. Change the password before using A3 outside a private development environment.**

## 🔐 Security Notes

- Cloud mode requires an explicit `JWT_SECRET` with at least 32 characters.
- Local mode generates an ephemeral JWT secret when one is not supplied.
- CORS is environment-driven and does not use wildcard origins with credentials.
- Passwords are hashed with bcrypt.
- Dataset uploads should remain behind authenticated endpoints.
- Local storage paths should be treated as private application data.
- Production database schema changes should use Alembic migrations rather than relying on startup table creation.

## 🧪 CI

GitHub Actions runs backend Python compilation checks and frontend install, lint and build checks on pushes and pull requests to `main`.

## 🗺️ Roadmap

### Near term
- [ ] Replace large in-memory dataset processing with streaming ingestion
- [ ] Split dataset ingestion/storage logic from API routers
- [ ] Add unit and integration tests for statistical algorithms
- [ ] Add Alembic migration workflow
- [ ] Add background jobs for long-running analytics

### Scale
- [ ] DuckDB + Parquet analytical engine
- [ ] PostgreSQL production mode
- [ ] Object storage integration
- [ ] Redis-backed job queue and caching
- [ ] Multi-tenant RBAC and audit logs

### AI
- [ ] Tool-based Copilot analytics execution
- [ ] Evidence-backed insights
- [ ] Automatic dataset diagnosis
- [ ] Natural-language chart generation
- [ ] Scheduled AI executive reports

## 📄 License

MIT License. Built for analytics engineering, Data Science learning, demonstrations and research.
