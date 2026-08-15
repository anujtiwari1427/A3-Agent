"""
A3 Platform Backend — FastAPI Main Entrypoint.
"""

import uuid
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .core.config import settings
from .core.auth import hash_password
from .core.database import Base, engine, SessionLocal
from .models.domain import Org, User

from .routers.auth import router as auth_router
from .routers.datasets import router as datasets_router
from .routers.profiling import router as profiling_router
from .routers.cleaning import router as cleaning_router
from .routers.analytics import router as analytics_router
from .routers.forecasting import router as forecasting_router
from .routers.anomalies import router as anomalies_router
from .routers.whatif import router as whatif_router
from .routers.ai import router as ai_router
from .routers.reports import router as reports_router
from .routers.health import router as health_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)


def _seed_local_admin() -> None:
    """Seed default admin user for local-first operations if database is uninitialized."""
    if settings.MODE != "local":
        return
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        org = db.query(Org).filter(Org.slug == "local").first()
        if not org:
            org = Org(
                id=str(uuid.uuid4()),
                name="Local Workspace",
                slug="local",
                plan="enterprise_local",
            )
            db.add(org)
            db.flush()

        admin = User(
            id=str(uuid.uuid4()),
            email="admin",
            hashed_password=hash_password("admin123"),
            full_name="Local Administrator",
            role="admin",
            org_id=org.id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        logger.info("✅ Seeded default local admin account (admin / admin123)")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_local_admin()
    yield


app = FastAPI(
    title="A3 Intelligence & Analytics Platform API",
    description="Modular Enterprise Data Analytics, Forecasting, Anomaly Detection & AI Copilot Suite",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ─────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(datasets_router)
app.include_router(profiling_router)
app.include_router(cleaning_router)
app.include_router(analytics_router)
app.include_router(forecasting_router)
app.include_router(anomalies_router)
app.include_router(whatif_router)
app.include_router(ai_router)
app.include_router(reports_router)
app.include_router(health_router)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")
