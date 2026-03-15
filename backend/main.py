import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

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

    logger.info("Startup complete.")
    yield
    logger.info("NavDashboard API shutting down...")


app = FastAPI(
    title="NavDashboard API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundException)
async def not_found_handler(request: Request, exc: NotFoundException):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(BadRequestException)
async def bad_request_handler(request: Request, exc: BadRequestException):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(UnauthorizedException)
async def unauthorized_handler(request: Request, exc: UnauthorizedException):
    return JSONResponse(status_code=401, content={"detail": str(exc)})


@app.exception_handler(ForbiddenException)
async def forbidden_handler(request: Request, exc: ForbiddenException):
    return JSONResponse(status_code=403, content={"detail": str(exc)})


@app.exception_handler(ConflictException)
async def conflict_handler(request: Request, exc: ConflictException):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


app.include_router(auth_router, prefix=settings.API_V1_PREFIX + "/auth", tags=["auth"])
app.include_router(devices_router, prefix=settings.API_V1_PREFIX + "/devices", tags=["devices"])
app.include_router(personnel_router, prefix=settings.API_V1_PREFIX + "/personnel", tags=["personnel"])
app.include_router(inventory_router, prefix=settings.API_V1_PREFIX + "/inventory", tags=["inventory"])
app.include_router(locations_router, prefix=settings.API_V1_PREFIX + "/locations", tags=["locations"])
app.include_router(couples_router, prefix=settings.API_V1_PREFIX + "/couples", tags=["couples"])
app.include_router(pairs_router, prefix=settings.API_V1_PREFIX + "/pairs", tags=["pairs"])


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
        "version": "0.1.0",
    }