"""A3 Platform Backend — FastAPI application entrypoint."""

import logging
import secrets
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .core.auth import hash_password
from .core.config import settings
from .core.database import Base, SessionLocal, engine
from .models.domain import Org, User
from .routers.ai import router as ai_router
from .routers.analytics import router as analytics_router
from .routers.anomalies import router as anomalies_router
from .routers.api_keys import router as api_keys_router
from .routers.audit import router as audit_router
from .routers.auth import router as auth_router
from .routers.cleaning import router as cleaning_router
from .routers.datasets import router as datasets_router
from .routers.forecasting import router as forecasting_router
from .routers.health import router as health_router
from .routers.jobs import router as jobs_router
from .routers.profiling import router as profiling_router
from .routers.reports import router as reports_router
from .routers.whatif import router as whatif_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _initialize_database() -> None:
    """Create tables for local-first development; cloud uses migrations."""
    if settings.MODE == "local":
        Base.metadata.create_all(bind=engine)


def _seed_local_admin() -> None:
    if settings.MODE != "local":
        return
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return
        org = Org(
            id=str(uuid.uuid4()),
            name="Admin Personal Workspace",
            slug=f"ws-{uuid.uuid4().hex[:8]}",
            plan="personal",
        )
        db.add(org)
        db.flush()
        password = settings.LOCAL_ADMIN_PASSWORD or secrets.token_urlsafe(16)
        db.add(User(
            id=str(uuid.uuid4()),
            email=settings.LOCAL_ADMIN_EMAIL,
            hashed_password=hash_password(password),
            full_name="Local Administrator",
            role="owner",
            org_id=org.id,
            is_active=True,
        ))
        db.commit()
        logger.warning("Local admin created: email=%s password=%s", settings.LOCAL_ADMIN_EMAIL, password)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _initialize_database()
    _seed_local_admin()
    yield


app = FastAPI(
    title="A3 Intelligence & Analytics Platform API",
    description="Modular enterprise analytics, forecasting, anomaly detection, AI Copilot, and background processing API",
    version="2.4.0",
    lifespan=lifespan,
)

# Observability Middleware: Correlation ID, request latency, and structured logging
@app.middleware("http")
async def observability_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-MS"] = str(duration_ms)
    logger.info(
        "request_completed method=%s path=%s status=%d duration_ms=%.2f request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(settings.ALLOWED_ORIGINS)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-API-Key", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time-MS"],
)

for router in (
    auth_router,
    api_keys_router,
    jobs_router,
    audit_router,
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
