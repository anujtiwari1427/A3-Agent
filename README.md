# A3 — Advanced Analytics & Intelligence Platform

> **Modular Data Analytics, Forecasting, Anomaly Detection & AI Copilot Suite**

A3 is a local-first analytics platform built with **FastAPI, SQLAlchemy, Next.js, React and Tailwind CSS**. It combines dataset management, automated profiling, non-destructive cleaning, statistical analytics, forecasting, anomaly detection, What-If simulation, grounded AI reasoning and executive reporting.

---

## 🛡️ How A3-Agent Protects Your Data

A3-Agent is architected with strict, privacy-by-default multi-user isolation across all analytical, storage, and AI layers.

### Multi-User Privacy Architecture

1. **Private Personal Workspaces**:
   - Every local and cloud user is registered with an independent, dedicated personal workspace (unique `org_id` and unique workspace slug).
   - No shared global workspaces: User A and User B operate in completely distinct boundaries.
2. **Owner-Scoped Dataset Access**:
   - In Local Mode, datasets are strictly restricted to `dataset.org_id == current_user.org_id` AND `dataset.uploaded_by == current_user.id`.
   - In Cloud Mode, datasets are private to the creator by default, with explicit opt-in sharing (`visibility = 'organization'`).
3. **Server-Side Authorization & Anti-IDOR Enforcement**:
   - All dataset, profiling, analytics, forecasting, anomaly detection, cleaning, AI Copilot, reports, background jobs, and API key endpoints verify ownership via centralized repository helpers (`DatasetRepository.get_for_user`, `ReportRepository.get_for_user`, `JobRepository.get_for_user`).
   - If a user attempts to access another user's dataset by guessing or specifying an ID, the server returns `404 Not Found`, eliminating information leakage and ID enumeration.
4. **Partitioned Physical Storage Isolation**:
   - Files are stored in partitioned directories: `{org_id}/{user_id}/datasets/{dataset_id}/{filename}`.
   - Raw storage paths are never exposed to clients; downloads require full authentication and ownership authorization.
5. **Frontend State & Cache Isolation**:
   - Logout clears `localStorage`, `sessionStorage`, and React component memory.
   - Prevents any stale data or cached datasets from persisting across login sessions.
6. **Security License Key Activation**:
   - Configurable via `LOCAL_LICENSE_KEY`.
   - Acts as an application activation gate rather than a shared universal identity.

---

## 🏗️ Architecture

```text
A3-Agent/
├── a3/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/          # config, auth, database, storage, authorization, security
│   │   │   ├── models/        # SQLAlchemy models + isolation indexes
│   │   │   ├── schemas/       # Pydantic DTOs
│   │   │   ├── repositories/  # privacy-enforced data access layers
│   │   │   ├── services/      # analytics, cleaning, forecasting, and AI Copilot
│   │   │   ├── routers/       # authorized REST API modules
│   │   │   └── main.py
│   │   ├── alembic/            # versioned database migrations
│   │   ├── tests/              # pytest suite (including privacy regression tests)
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/app/            # Next.js routes with multi-user auth
│       ├── src/components/     # UI, charts and workspace views
│       └── src/lib/            # typed API client and types
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

- API docs: `http://localhost:8000/docs`
- Liveness: `http://localhost:8000/api/v1/health`
- Readiness: `http://localhost:8000/api/v1/ready`
- Admin audit log: `http://localhost:8000/api/v1/audit`

### Frontend

```bash
cd a3/frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### Database Migrations

Database schema modifications are managed via Alembic:

```bash
cd a3/backend
alembic upgrade head
alembic check
```

## 🧪 Automated Testing & Privacy CI Gates

Run the test suite including the permanent privacy regression tests:

```bash
cd a3/backend
python -m pytest -v
```

CI automatically executes:
- Backend: Python syntax validation, pytest test suite (including `test_privacy_regression.py`), and Alembic schema checks.
- Frontend: ESLint, TypeScript typecheck (`tsc --noEmit`), and Next.js production build (`npm run build`).

## 📄 License

MIT License. Built for analytics engineering, Data Science learning, demonstrations and research.
