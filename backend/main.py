import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import check_db_connection
from core.exceptions import register_exception_handlers

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("NavDashboard API starting...")
    db_ok = await check_db_connection()
    if db_ok:
        logger.info("Database connected successfully.")
    else:
        logger.warning("Database connection failed.")
    yield
    logger.info("NavDashboard API shutting down...")


app = FastAPI(
    title="NavDashboard API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/api/v1/health")
async def health_check():
    db_ok = await check_db_connection()
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "disconnected",
        "version": "0.1.0",
    }