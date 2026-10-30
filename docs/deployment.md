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
