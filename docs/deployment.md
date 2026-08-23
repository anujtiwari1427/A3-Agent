# A3-Agent Deployment Guide

## 1. Local Development Setup

### Backend
```bash
cd a3/backend
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Unix: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd a3/frontend
npm install
npm run dev
```

---

## 2. Docker Deployment
Run both frontend and backend services containerized:
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs`

---

## 3. Production Cloud Deployment (Render / Vercel / Cloud Run)

### Backend (Render / Docker / Cloud Run)
- Build Command: `pip install -r requirements.txt && alembic upgrade head`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Set environment variables:
  - `MODE=cloud`
  - `JWT_SECRET=<32+ char random string>`
  - `CLOUD_DATABASE_URL=postgresql://user:pass@host:5432/dbname`
  - `ALLOWED_ORIGINS=["https://app.yourdomain.com"]`

### Frontend (Vercel / Netlify / Node Container)
- Build Command: `npm run build`
- Output Directory: `.next`
- Set environment variables:
  - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
