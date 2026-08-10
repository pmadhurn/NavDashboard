import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from core.authz import assert_full_coverage, enforce_permissions
from core.config import settings
from core.database import async_session_factory, engine
from core.exceptions import (
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ForbiddenException,
    ConflictException,
)
from modules.auth.router import router as auth_router
from modules.devices.router import router as devices_router
from modules.personnel.router import router as personnel_router
from modules.inventory.router import router as inventory_router
from modules.locations.router import router as locations_router
from modules.couples.router import router as couples_router
from modules.pairs.router import router as pairs_router
from modules.troubleshooting.router import router as troubleshooting_router
from modules.status.router import router as status_router
from modules.dashboard.router import router as dashboard_router
from modules.search.router import router as search_router
from modules.audit_trail.router import router as audit_router
from modules.comparison.router import router as comparison_router
from modules.documents.router import router as documents_router
from modules.backup.router import router as backup_router
from modules.reports.router import router as reports_router
from modules.ai_assistant.router import router as ai_router
from modules.settings.router import router as settings_router
from modules.downloads.router import router as downloads_router
from modules.assets.router import router as assets_router
from modules.projects.router import router as projects_router
from modules.finance.router import router as finance_router
from modules.seeding.router import router as seeding_router
from modules.attendance.router import router as attendance_router
from modules.updates.router import router as updates_router, leadership_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NavDashboard API starting...")

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified.")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")

    try:
        async with async_session_factory() as db:
            from modules.auth.service import ensure_default_admin

            await ensure_default_admin(db)
    except Exception as e:
        logger.error(f"Default admin creation failed: {e}")

    # Refuse to serve if any operation lacks a permission mapping. This is what
    # makes the central map in core/authz_endpoints.py safe: an endpoint added
    # without a permission stops the app rather than shipping unguarded.
    assert_full_coverage(app)

    logger.info("Startup complete.")
    yield
    logger.info("NavDashboard API shutting down...")


app = FastAPI(
    title="NavDashboard API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    # Authorization for EVERY operation, including any added later. Registered
    # here rather than per-route because the property that matters — no
    # operation escapes — is a statement about the whole route table. Appending
    # to app.router.dependencies after this point does nothing: dependants are
    # baked into each route at registration.
    dependencies=[Depends(enforce_permissions)],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(status_code=404, content={"detail": exc.detail})


@app.exception_handler(BadRequestException)
async def bad_request_handler(request: Request, exc: BadRequestException):
    return JSONResponse(status_code=400, content={"detail": exc.detail})


@app.exception_handler(UnauthorizedException)
async def unauthorized_handler(request: Request, exc: UnauthorizedException):
    return JSONResponse(status_code=401, content={"detail": exc.detail})


@app.exception_handler(ForbiddenException)
async def forbidden_handler(request: Request, exc: ForbiddenException):
    return JSONResponse(status_code=403, content={"detail": exc.detail})


@app.exception_handler(ConflictException)
async def conflict_handler(request: Request, exc: ConflictException):
    return JSONResponse(status_code=409, content={"detail": exc.detail})


app.include_router(auth_router, prefix=settings.API_V1_PREFIX + "/auth", tags=["auth"])
app.include_router(devices_router, prefix=settings.API_V1_PREFIX + "/devices", tags=["devices"])
app.include_router(personnel_router, prefix=settings.API_V1_PREFIX + "/personnel", tags=["personnel"])
app.include_router(inventory_router, prefix=settings.API_V1_PREFIX + "/inventory", tags=["inventory"])
app.include_router(locations_router, prefix=settings.API_V1_PREFIX + "/locations", tags=["locations"])
app.include_router(couples_router, prefix=settings.API_V1_PREFIX + "/couples", tags=["couples"])
app.include_router(pairs_router, prefix=settings.API_V1_PREFIX + "/pairs", tags=["pairs"])
app.include_router(troubleshooting_router, prefix=settings.API_V1_PREFIX + "/troubleshooting", tags=["troubleshooting"])
app.include_router(status_router, prefix=settings.API_V1_PREFIX + "/status", tags=["status"])
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX + "/dashboard", tags=["dashboard"])
app.include_router(search_router, prefix=settings.API_V1_PREFIX + "/search", tags=["search"])
app.include_router(audit_router, prefix=settings.API_V1_PREFIX + "/audit", tags=["audit"])
app.include_router(comparison_router, prefix=settings.API_V1_PREFIX + "/comparison", tags=["comparison"])
app.include_router(documents_router, prefix=settings.API_V1_PREFIX + "/documents", tags=["documents"])
app.include_router(backup_router, prefix=settings.API_V1_PREFIX + "/backup", tags=["backup"])
app.include_router(reports_router, prefix=settings.API_V1_PREFIX + "/reports", tags=["reports"])
app.include_router(ai_router, prefix=settings.API_V1_PREFIX + "/ai", tags=["AI Assistant"])
app.include_router(settings_router, prefix=settings.API_V1_PREFIX + "/settings", tags=["Settings"])
app.include_router(downloads_router, prefix=settings.API_V1_PREFIX + "/downloads", tags=["downloads"])
app.include_router(assets_router, prefix=settings.API_V1_PREFIX + "/assets", tags=["assets"])
app.include_router(projects_router, prefix=settings.API_V1_PREFIX + "/projects", tags=["projects"])
app.include_router(finance_router, prefix=settings.API_V1_PREFIX + "/finance", tags=["finance"])
app.include_router(seeding_router, prefix=settings.API_V1_PREFIX + "/seeding", tags=["seeding"])
app.include_router(attendance_router, prefix=settings.API_V1_PREFIX + "/attendance", tags=["attendance"])
app.include_router(updates_router, prefix=settings.API_V1_PREFIX + "/updates", tags=["updates"])
app.include_router(leadership_router, prefix=settings.API_V1_PREFIX + "/leadership", tags=["leadership"])


@app.get(settings.API_V1_PREFIX + "/health", tags=["health"])
async def health_check():
    db_status = "disconnected"
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "version": "1.0.0",
    }