"""A3 Platform Backend — FastAPI application entrypoint."""

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .core.auth import hash_password
from .core.config import settings
from .core.database import Base, SessionLocal, engine
from .models.domain import Org, User
from .routers.ai import router as ai_router
from .routers.analytics import router as analytics_router
from .routers.anomalies import router as anomalies_router
from .routers.auth import router as auth_router
from .routers.cleaning import router as cleaning_router
from .routers.datasets import router as datasets_router
from .routers.forecasting import router as forecasting_router
from .routers.health import router as health_router
from .routers.profiling import router as profiling_router
from .routers.reports import router as reports_router
from .routers.whatif import router as whatif_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _initialize_database() -> None:
    """Create tables for local-first development.

    Production deployments should use Alembic migrations instead of relying on
    startup-time table creation.
    """
    if settings.MODE == "local":
        Base.metadata.create_all(bind=engine)


def _seed_local_admin() -> None:
    """Create the demo local account only in explicit local mode."""
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
        logger.warning(
            "Local demo account created. Change the demo password before exposing this instance."
        )
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _initialize_database()
    _seed_local_admin()
    yield


app = FastAPI(
    title="A3 Intelligence & Analytics Platform API",
    description="Modular enterprise analytics, forecasting, anomaly detection and AI Copilot API",
    version="2.2.0",
    lifespan=lifespan,
)

# Keep CORS explicit and environment-driven. Never use '*' with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.ALLOWED_ORIGINS)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

for router in (
    auth_router,
    datasets_router,
    profiling_router,
    cleaning_router,
    analytics_router,
    forecasting_router,
    anomalies_router,
    whatif_router,
    ai_router,
    reports_router,
    health_router,
):
    app.include_router(router)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")
