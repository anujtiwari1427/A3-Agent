# a3 — Complete Platform Building Prompt
# Cloud + Local Hybrid | Multi-Tenant SaaS | Interactive Data Analytics
# Version 2.0

---

## OVERVIEW

Build **a3** — a unified, interactive data analytics platform that runs in two modes from a single codebase:

| Mode | Where it runs | Who it's for |
|---|---|---|
| **Local Mode** | Fully on the user's machine | Privacy-first, offline, zero cloud |
| **Cloud Mode** | Multi-tenant SaaS on free-tier cloud | Teams, orgs, collaboration |

The user picks their mode at login. The product is identical — same UI, same agents, same features. Only the compute and storage backend changes. This is a3's core competitive advantage over every competitor: **one product, two deployment realities**.

---

# PART 1 — SYSTEM ARCHITECTURE

## 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        a3 FRONTEND (Next.js)                    │
│              Single codebase — Local + Cloud aware              │
└────────────────────────┬────────────────────────────────────────┘
                         │
              Mode selected at login
                         │
          ┌──────────────┴──────────────┐
          │                             │
  ┌───────▼────────┐           ┌────────▼───────┐
  │  LOCAL MODE    │           │  CLOUD MODE    │
  │                │           │                │
  │ FastAPI        │           │ FastAPI on     │
  │ localhost:8000 │           │ Render / Fly.io│
  │                │           │                │
  │ Ollama (LLM)   │           │ Groq API (LLM) │
  │ SQLite         │           │ PostgreSQL      │
  │ Local FS       │           │ Supabase Storage│
  └────────────────┘           └────────────────┘
```

## 1.2 Free-Tier Cloud Stack (Zero Cost to Start)

| Layer | Service | Free Tier Limits |
|---|---|---|
| **Backend Hosting** | Render.com | 750 hrs/month, auto-sleep |
| **Database** | Supabase (PostgreSQL) | 500MB, 2 projects |
| **File Storage** | Supabase Storage | 1GB |
| **LLM Inference** | Groq API | 14,400 req/day free |
| **Auth** | Supabase Auth | Unlimited users |
| **Frontend** | Vercel | Unlimited deploys |
| **Queue / Jobs** | Supabase Edge Functions | 500k invocations/month |
| **Monitoring** | Betterstack (Logtail) | 1GB logs/month free |

**Upgrade path (when you outgrow free tier):**
- Backend → Render paid ($7/mo) or Railway ($5/mo)
- DB → Supabase Pro ($25/mo) or Neon ($19/mo)
- LLM → Groq paid or switch to OpenRouter

## 1.3 Multi-Tenancy Model

```
Organization (Tenant)
    │
    ├── Users (members of the org)
    │       ├── role: owner
    │       ├── role: admin
    │       └── role: analyst
    │
    ├── Datasets (org-scoped, never cross-org)
    │
    ├── Sessions (pipeline runs, chat history)
    │
    └── Dashboards (pinned charts, shared within org)
```

**Row-Level Security (RLS):** Every database table has Supabase RLS policies. An org's data is invisible to all other orgs at the database level — not just the application level. This is non-negotiable.

---

# PART 2 — BACKEND SPECIFICATION

## 2.1 Project Structure

```
/backend
  /app
    /api
      /v1
        auth.py          ← login, register, token refresh
        users.py         ← user management (admin only)
        orgs.py          ← org creation, member management
        datasets.py      ← upload, list, delete datasets
        agents.py        ← trigger agents, stream output
        sessions.py      ← session log CRUD
        dashboards.py    ← dashboard pin/unpin
        billing.py       ← usage tracking, plan check
    /agents
      orchestrator.py    ← routes tasks to sub-agents
      cleaning.py        ← Data Cleaning Agent
      analysis.py        ← Analysis Agent
      visualization.py   ← Visualization Agent
      forecasting.py     ← Forecasting Agent
    /core
      config.py          ← MODE = "local" | "cloud", env vars
      database.py        ← SQLAlchemy, session factory
      security.py        ← JWT, password hashing
      storage.py         ← local FS or Supabase Storage (abstracted)
      llm.py             ← Ollama (local) or Groq (cloud) abstracted
    /models
      user.py
      org.py
      dataset.py
      session.py
      dashboard.py
      usage.py           ← track API calls per org for billing
    /schemas
      *.py               ← Pydantic v2 schemas for all models
    main.py
  /migrations             ← Alembic migrations
  .env.local
  .env.cloud
  requirements.txt
  Dockerfile
```

## 2.2 Mode Abstraction Layer

The key engineering pattern: **every external dependency is abstracted** so the same agent code works in both modes.

### LLM Abstraction (`/core/llm.py`)
```python
# Pseudocode — implement fully
class LLMClient:
    def __init__(self, mode: str):
        if mode == "local":
            self.client = OllamaClient(base_url="http://localhost:11434")
            self.model = "llama3"
        else:
            self.client = GroqClient(api_key=settings.GROQ_API_KEY)
            self.model = "llama3-70b-8192"  # Groq's free fast model

    async def complete(self, messages: list, stream: bool = True):
        # Same interface regardless of mode
        return await self.client.chat(messages=messages, stream=stream)
```

### Storage Abstraction (`/core/storage.py`)
```python
class StorageClient:
    def __init__(self, mode: str):
        self.mode = mode

    async def upload(self, file_bytes: bytes, path: str) -> str:
        if self.mode == "local":
            # Write to /data/uploads/{org_id}/{path}
            ...
        else:
            # Upload to Supabase Storage bucket
            ...

    async def download(self, path: str) -> bytes:
        ...

    async def delete(self, path: str):
        ...
```

### Database Abstraction (`/core/database.py`)
```python
# Local: SQLite via SQLAlchemy
# Cloud: PostgreSQL via SQLAlchemy (same ORM, different URL)
DATABASE_URL = (
    "sqlite:///./a3_local.db"
    if settings.MODE == "local"
    else settings.CLOUD_DATABASE_URL
)
```

## 2.3 Authentication & Authorization

### Local Mode
- Single admin creates accounts via seed script
- JWT tokens, no email verification required
- No OAuth needed

### Cloud Mode
- Supabase Auth handles signup/login/password reset
- Email verification required
- Support: email+password, Google OAuth, GitHub OAuth
- JWT from Supabase passed to FastAPI, validated on every request

### Authorization Middleware
```python
# Every endpoint checks:
# 1. Valid JWT
# 2. User is_active = True
# 3. User belongs to the org they're accessing
# 4. User has sufficient role for the action

# Role permissions matrix:
# owner  → everything
# admin  → manage members, datasets, sessions
# analyst → read/write own sessions, read shared datasets
```

## 2.4 Usage Tracking & Billing

Track per org:
```python
class UsageEvent(Base):
    org_id: UUID
    event_type: str     # "agent_run" | "dataset_upload" | "llm_call"
    agent_name: str     # "cleaning" | "analysis" | "visualization" | "forecast"
    tokens_used: int
    compute_ms: int
    timestamp: datetime
```

### Free Tier Limits (enforce in middleware)
```python
FREE_TIER_LIMITS = {
    "datasets_count": 5,
    "dataset_size_mb": 50,
    "agent_runs_per_month": 100,
    "llm_tokens_per_month": 500_000,
    "members_per_org": 3,
    "dashboards": 2,
}
```

When limit is hit → return `HTTP 402` with payload:
```json
{
  "error": "limit_reached",
  "limit": "agent_runs_per_month",
  "current": 100,
  "max": 100,
  "upgrade_url": "/billing/upgrade"
}
```

## 2.5 Real-Time Agent Streaming

Agents stream output token-by-token to the frontend using **Server-Sent Events (SSE)**:

```python
@router.post("/agents/run")
async def run_agent(request: AgentRunRequest, current_user: User = Depends(get_current_user)):
    async def stream_agent_output():
        async for chunk in orchestrator.run(
            agent=request.agent,
            dataset_id=request.dataset_id,
            query=request.query,
            org_id=current_user.org_id,
        ):
            yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_agent_output(), media_type="text/event-stream")
```

Chunk format:
```json
{
  "agent": "analysis",
  "type": "text" | "code" | "chart" | "tldr" | "status",
  "content": "...",
  "elapsed_ms": 1240
}
```

---

# PART 3 — FRONTEND SPECIFICATION

## 3.1 Mode-Aware Login Screen

The login screen is the only place the two modes diverge visually:

```
┌─────────────────────────────────────┐
│              ◈ a3                   │
│    Data Intelligence Platform       │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │  LOCAL MODE │  │ CLOUD MODE  │  │
│  │             │  │             │  │
│  │ 🔒 Private  │  │ ☁ Teams    │  │
│  │ No cloud    │  │ Collaborate │  │
│  │ Offline OK  │  │ From anywhere│  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  [Select a mode to continue]        │
└─────────────────────────────────────┘
```

After selecting Cloud Mode → standard email/password login + Google/GitHub OAuth buttons.
After selecting Local Mode → simple username/password, no OAuth.

A **mode badge** persists in the topbar for the entire session:
- Local: `🔒 Local` in --agent-clean (emerald)
- Cloud: `☁ Cloud` in --color-accent-primary (blue)

## 3.2 Cloud-Only UI Panels

These panels appear only when mode = cloud:

### Org Switcher (Topbar)
```
[◈ a3]  [Acme Corp ▾]  [sales_q4.csv · 12k×18]
```
Clicking org name → dropdown with org list + "Create new org"

### Members Panel (Settings → Team)
```
Team Members — Acme Corp
─────────────────────────────────────────
  ● Sarah Chen      owner    sarah@acme.com
  ● Rahul Mehta     admin    rahul@acme.com
  ● Ji-ho Park      analyst  jiho@acme.com

  [+ Invite member]   [3 / 3 free tier]
```

### Shared Datasets
Datasets in cloud mode are org-scoped. A "Shared" badge appears on datasets uploaded by other members.

### Collaboration Indicators
When another member is viewing the same dataset:
```
● Sarah is also working on this dataset
```
Small avatar dot on the dataset badge in the topbar. No real-time sync needed — just a presence indicator via Supabase Realtime.

## 3.3 Usage & Billing Panel (Cloud Mode Only)

Accessible from Settings → Usage:

```
Usage this month — Acme Corp (Free Tier)
──────────────────────────────────────────
Agent Runs       ██████░░░░  61 / 100
Dataset Storage  ███░░░░░░░  28MB / 50MB
LLM Tokens       ████░░░░░░  241k / 500k
Members          ███████░░░  3 / 3

⚠ You're at 3/3 members. Upgrade to add more.

[ Upgrade to Pro — $19/mo ]
```

Progress bars use agent colors where applicable. At 80% of any limit → amber warning. At 100% → red with upgrade CTA.

## 3.4 Dashboard Sharing (Cloud Mode Only)

In cloud mode, dashboards can be shared within the org:

- **Private** (default) → only creator sees it
- **Org-shared** → all members can view
- **Public link** → read-only shareable URL (Pro tier only)

Share toggle appears in Dashboard view top-right: `[🔒 Private ▾]`

---

# PART 4 — DEPLOYMENT GUIDE

## 4.1 Local Mode Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/a3
cd a3

# 2. Backend
cd backend
cp .env.local .env
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_admin.py   # creates first admin user
uvicorn app.main:app --reload --port 8000

# 3. Install Ollama + pull model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3

# 4. Frontend
cd ../frontend
npm install
cp .env.local.example .env.local
npm run dev
# → http://localhost:3000
```

## 4.2 Cloud Deployment (Free Tier)

### Step 1: Supabase Setup
```
1. Create project at supabase.com
2. Run /backend/migrations/supabase_schema.sql in SQL editor
3. Enable RLS on all tables (script provided in /migrations/enable_rls.sql)
4. Enable Auth providers: Email, Google, GitHub
5. Create storage bucket: "datasets" (private)
6. Copy: Project URL, anon key, service role key
```

### Step 2: Groq API
```
1. Create account at console.groq.com
2. Generate API key
3. Free tier: 14,400 requests/day, rate limited
```

### Step 3: Render.com Backend
```
1. Connect GitHub repo to Render
2. New Web Service → select /backend directory
3. Build command: pip install -r requirements.txt
4. Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
5. Environment variables:
   MODE=cloud
   CLOUD_DATABASE_URL=postgresql://[supabase connection string]
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=xxx
   GROQ_API_KEY=xxx
   JWT_SECRET=xxx (generate: openssl rand -hex 32)
6. Deploy → note your Render URL
```

### Step 4: Vercel Frontend
```
1. Import GitHub repo to vercel.com
2. Root directory: /frontend
3. Environment variables:
   NEXT_PUBLIC_MODE=cloud
   NEXT_PUBLIC_API_URL=https://your-app.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
4. Deploy → your app is live
```

### Step 5: Custom Domain (optional, free on Vercel)
```
Vercel Dashboard → Domains → Add → point your DNS
```

## 4.3 Environment Variables Reference

```bash
# .env.local (Local Mode)
MODE=local
DATABASE_URL=sqlite:///./a3_local.db
STORAGE_PATH=./data/uploads
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
JWT_SECRET=your-secret-here
JWT_EXPIRE_MINUTES=10080   # 7 days

# .env.cloud (Cloud Mode)
MODE=cloud
CLOUD_DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
GROQ_API_KEY=xxx
JWT_SECRET=your-secret-here
JWT_EXPIRE_MINUTES=1440    # 24 hours (stricter for cloud)
ALLOWED_ORIGINS=https://your-app.vercel.app
```

---

# PART 5 — DATABASE SCHEMA

```sql
-- Works on both SQLite (local) and PostgreSQL (cloud)
-- For cloud: add RLS policies after each table

CREATE TABLE orgs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(50) UNIQUE NOT NULL,
    plan        VARCHAR(20) DEFAULT 'free',  -- free | pro | enterprise
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES orgs(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),           -- null if OAuth only
    full_name       VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'analyst',  -- owner | admin | analyst
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE datasets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_type   VARCHAR(20),   -- csv | xlsx | parquet | json | sqlite
    row_count   INTEGER,
    col_count   INTEGER,
    size_bytes  BIGINT,
    health_score INTEGER,      -- 0-100, set by Cleaning Agent
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    dataset_id  UUID REFERENCES datasets(id),
    title       VARCHAR(255),
    mode        VARCHAR(10),   -- local | cloud
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20),   -- user | agent
    agent_name  VARCHAR(30),   -- cleaning | analysis | visualization | forecast
    content     TEXT,
    content_type VARCHAR(20),  -- text | code | chart | tldr
    elapsed_ms  INTEGER,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dashboards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
    created_by  UUID REFERENCES users(id),
    title       VARCHAR(255),
    visibility  VARCHAR(20) DEFAULT 'private',  -- private | org | public
    public_slug VARCHAR(100) UNIQUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID REFERENCES orgs(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    event_type  VARCHAR(50),
    agent_name  VARCHAR(30),
    tokens_used INTEGER DEFAULT 0,
    compute_ms  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

---

# PART 6 — API ROUTES REFERENCE

```
POST   /api/v1/auth/register          → create account (cloud)
POST   /api/v1/auth/login             → get JWT
POST   /api/v1/auth/refresh           → refresh token
POST   /api/v1/auth/logout

GET    /api/v1/orgs/me                → current org
PATCH  /api/v1/orgs/me               → update org name
GET    /api/v1/orgs/me/members        → list members
POST   /api/v1/orgs/me/invite         → invite by email
DELETE /api/v1/orgs/me/members/{id}   → remove member

GET    /api/v1/datasets               → list org datasets
POST   /api/v1/datasets/upload        → upload file (multipart)
GET    /api/v1/datasets/{id}          → dataset metadata
DELETE /api/v1/datasets/{id}          → delete dataset
GET    /api/v1/datasets/{id}/preview  → first 100 rows as JSON

POST   /api/v1/agents/run             → run agent (SSE stream)
GET    /api/v1/agents/status          → all agent statuses

GET    /api/v1/sessions               → list sessions
POST   /api/v1/sessions               → create session
GET    /api/v1/sessions/{id}          → full session with messages
DELETE /api/v1/sessions/{id}

GET    /api/v1/dashboards             → list dashboards
POST   /api/v1/dashboards             → create dashboard
PATCH  /api/v1/dashboards/{id}        → update visibility
DELETE /api/v1/dashboards/{id}

GET    /api/v1/usage/summary          → current month usage vs limits
GET    /api/v1/usage/events           → raw usage log

GET    /api/v1/health                 → { mode, version, agents: all_ready }
```

---

# PART 7 — SECURITY CHECKLIST

### Both Modes
- [ ] All passwords hashed with bcrypt (cost factor 12)
- [ ] JWT tokens expire (7 days local, 24 hours cloud)
- [ ] All file uploads validated: type whitelist, size limit, virus scan path
- [ ] SQL injection: use ORM only, no raw string queries
- [ ] Agent code execution sandboxed (no `exec()` on user data directly)
- [ ] CORS configured to allowed origins only
- [ ] Rate limiting on all auth endpoints (10 req/min)

### Cloud Mode Additional
- [ ] RLS enabled on all Supabase tables
- [ ] Service role key never exposed to frontend
- [ ] Org isolation tested: user from Org A cannot access Org B data
- [ ] Usage limits enforced server-side (never trust frontend)
- [ ] HTTPS only (Vercel + Render enforce this by default)
- [ ] Secrets in environment variables, never in code
- [ ] Supabase Storage bucket is private (no public URLs without signed tokens)

---

# PART 8 — WHAT BEATS EVERY COMPETITOR

| Competitor | Their Gap | How a3 wins |
|---|---|---|
| **Tableau Cloud** | $70/user/month, no AI agents | a3 free tier + AI pipeline built in |
| **Power BI** | Microsoft lock-in, weak AI | a3 is stack-agnostic, multi-LLM |
| **Databricks** | Complex setup, $$$, overkill for most | a3 deploys in 20 minutes |
| **Snowflake** | Cloud-only, data leaves your infra | a3 Local Mode: nothing leaves |
| **ChatGPT** | Can't read your actual data files | a3 reads real datasets locally |
| **Metabase** | BI only, no AI agents, no forecasting | a3 has full AI pipeline |
| **Evidence.dev** | SQL-only, no NL interface | a3 understands plain English |

**The unique position no one else holds:**
> a3 is the only platform where a data scientist can work fully offline with local LLMs one day, then switch to cloud collaboration with their team the next — using the exact same interface, with no data migration.

---

*End of a3 Platform Building Prompt — Version 2.0*
*Covers: Architecture · Backend · Frontend · Deployment · Database · API · Security*
