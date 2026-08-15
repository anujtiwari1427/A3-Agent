# A3 — Advanced Analytics & Intelligence Platform

> **Modular Enterprise Data Analytics, Forecasting, Anomaly Detection & AI Copilot Suite**

---

## 🌟 Overview

**A3** is a high-performance, modular, and local-first data intelligence platform. It provides business intelligence, automated statistical profiling, non-destructive data cleaning, interactive visual charting, forward-looking time-series forecasting, statistical outlier detection, parameter sensitivity (What-If) simulations, and privacy-grounded AI copilot reasoning.

A3 is designed to run **100% locally** with SQLite and local statistical engines, while maintaining clean architectural boundaries for PostgreSQL and cloud deployment readiness.

---

## 🏗️ Architecture

```
A3-agent/
├── a3/
│   ├── backend/                      # FastAPI Python REST API Server
│   │   ├── app/
│   │   │   ├── core/                 # Config, Database Engine, Security & JWT Auth
│   │   │   ├── models/               # SQLAlchemy ORM Models (Org, User, Dataset, Report)
│   │   │   ├── schemas/              # Pydantic v2 Type-Safe DTO Schemas
│   │   │   ├── services/             # Pure Business Logic & Statistical Algorithms
│   │   │   │   ├── dataset_service.py     # File I/O, tabular parsing, sample datasets
│   │   │   │   ├── profiling_service.py   # 5-number distributions, quartiles, skewness, quality audit
│   │   │   │   ├── cleaning_service.py    # Non-destructive cleaning engine & preview diff
│   │   │   │   ├── analytics_service.py   # Pearson & Spearman correlations, OLS regression, group-by
│   │   │   │   ├── forecasting_service.py # Linear, Exponential, Weighted Moving Average with CIs
│   │   │   │   ├── anomaly_service.py     # Z-Score & IQR outlier detection
│   │   │   │   ├── whatif_service.py      # Parameter sensitivity simulation engine
│   │   │   │   ├── ai_copilot_service.py  # Intent detection & grounded analytical reasoning
│   │   │   │   └── report_service.py      # Strategic executive report compiler
│   │   │   ├── routers/              # Modular REST API Routers
│   │   │   └── main.py               # FastAPI App & Lifespan Seeding
│   │   ├── a3_local.db               # SQLite local storage
│   │   ├── requirements.txt          # Python dependencies
│   │   └── .env.example              # Environment configuration template
│   │
│   └── frontend/                     # Next.js 16 / React 19 / Tailwind CSS v4 App
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx        # Toast Provider & global typography
│       │   │   ├── globals.css       # Design tokens & print stylesheet
│       │   │   ├── page.tsx          # Mode selector & authentication gateway
│       │   │   └── dashboard/        # Main Analytics Workspace Controller
│       │   ├── components/
│       │   │   ├── layout/           # Sidebar, Header, Toast notifications
│       │   │   ├── ui/               # Card, Button, Badge, Skeleton, EmptyState, Modal
│       │   │   ├── charts/           # Modular SVG Charts (Area, Line, Bar, Scatter, Donut, Radar, BoxPlot, Heatmap)
│       │   │   └── views/            # 11 Dedicated Workspace Views
│       │   └── lib/
│       │       ├── api.ts            # Type-safe API Client
│       │       ├── types.ts          # TypeScript interfaces
│       │       ├── chartRecommendations.ts # Smart heuristic chart recommender
│       │       └── exportUtils.ts    # CSV, JSON, Markdown, PNG/SVG export helpers
│       ├── package.json
│       └── next.config.ts
└── README.md
```

---

## 🚀 Key Feature Workspaces

| Workspace | Description |
| :--- | :--- |
| **1. Executive Dashboard** | Real-time KPI scorecards, data quality health index, primary metric progression, category donut charts, and 1-click sample loaders. |
| **2. Datasets & Grid** | Complete dataset management: upload, duplicate, rename, delete, raw vs cleaned downloads, and 50-row paginated data grid. |
| **3. Data Profile** | 5-number distributions (Min, Q1, Median, Q3, Max), IQR, Mean, Variance, StdDev, Skewness, Mode, and 4-tier data quality audit. |
| **4. Cleaning Studio** | **Non-destructive** data cleaning with live preview diffs before applying: duplicate removal, numeric/categorical imputation, outlier clipping/dropping, string trimming, and case normalization. |
| **5. Analytics Studio** | Pearson & Spearman correlation heatmap matrix, bivariate OLS linear regression solver with R² equation, and categorical group-by segment aggregations. |
| **6. Graph Studio** | Interactive SVG charting suite (Line, Area, Bar, Horizontal Bar, Scatter with Regression, Donut, Radar, Box Plot) with AI heuristic chart recommendations and 1-click high-res PNG export. |
| **7. Forecasting** | Time-series predictive modeling (Linear Trend, Exponential Growth, Weighted Moving Average) across 7d, 30d, 90d, 180d, and 365d horizons with 80%, 95%, and 99% confidence interval bands. |
| **8. Anomaly Detection** | Statistical outlier detection using Z-Score (&gt; σ) and IQR fences with severity classifications (Mild, High, Critical) and row context inspection. |
| **9. What-If Analysis** | Parameter sensitivity playground allowing users to adjust driver variable multipliers and project estimated delta outcomes with simulation disclaimers. |
| **10. AI Copilot** | Local, privacy-safe natural-language reasoning grounded directly in dataset statistical profiles without sending raw data to external services. Separates findings into **FACT**, **OBSERVATION**, and **RECOMMENDATION**. |
| **11. Executive Reports** | Automated strategic briefings with publication-grade layout, print-ready PDF styling, and 1-click Markdown/JSON exports. |

---

## 🛠️ Local Installation & Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+ & npm**

### 2. Backend Setup
```bash
cd a3/backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
uvicorn app.main:app --reload --port 8000
```
* Backend API Documentation: `http://localhost:8000/docs`
* Health Check: `http://localhost:8000/api/v1/health`

### 3. Frontend Setup
```bash
cd a3/frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
* Open in browser: `http://localhost:3000`

### 4. Default Login Credentials
* **Mode**: Local Mode
* **Username**: `admin`
* **Password**: `admin123`

---

## 🔒 Security & Privacy Architecture
- **Zero Raw Data Leakage**: AI Copilot analyzes computed metadata and statistical aggregations locally; raw individual user records are never forwarded to third parties.
- **Non-Destructive Storage**: Original raw uploads are backed up under `raw_storage_path`. Cleaned datasets are written as versioned derivatives.
- **JWT Authentication & Bcrypt**: Passwords hashed with salted bcrypt; endpoints authenticated via standard Bearer tokens.
- **Upload Validation**: Strict file type sniffing (CSV, JSON, TSV) with a 25MB file size ceiling and path sanitization.

---

## 📄 License
MIT License. Built for enterprise analytics demonstration and research evaluations.
