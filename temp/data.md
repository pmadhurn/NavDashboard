Files I Need (Full Content)
Critical — modifying these directly:

1. backend/main.py
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
from modules.troubleshooting.router import router as troubleshooting_router
from modules.status.router import router as status_router
from modules.dashboard.router import router as dashboard_router
from modules.search.router import router as search_router
from modules.audit_trail.router import router as audit_router
from modules.comparison.router import router as comparison_router

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
app.include_router(troubleshooting_router, prefix=settings.API_V1_PREFIX + "/troubleshooting", tags=["troubleshooting"])
app.include_router(status_router, prefix=settings.API_V1_PREFIX + "/status", tags=["status"])
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX + "/dashboard", tags=["dashboard"])
app.include_router(search_router, prefix=settings.API_V1_PREFIX + "/search", tags=["search"])
app.include_router(audit_router, prefix=settings.API_V1_PREFIX + "/audit", tags=["audit"])
app.include_router(comparison_router, prefix=settings.API_V1_PREFIX + "/comparison", tags=["comparison"])


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
        "version": "0.11.1",
    }


2. backend/migrations/env.py
    import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from core.config import settings
from core.database import Base

# Model imports for autogenerate
from shared.audit import AuditLog  # noqa
from modules.auth.models import User  # noqa
from modules.devices.models import Device, DeviceStatusHistory  # noqa
from modules.personnel.models import Person, AssignmentHistory  # noqa
from modules.inventory.models import FittingMaterial, MaterialTemplate  # noqa
from modules.locations.models import Location, LocationHistory  # noqa
from modules.couples.models import Couple  # noqa
from modules.pairs.models import Pair  # noqa
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry  # noqa
from modules.status.models import StatusChangeLog  # noqa

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name == "spatial_ref_sys":
        return False
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


def run_migrations_offline() -> None:
    url = settings.async_database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(
        settings.async_database_url,
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

3. frontend/src/app/routes.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  ApiOutlined,
  LinkOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  ToolOutlined,
  RobotOutlined,
  HistoryOutlined,
  FileOutlined,
  BarChartOutlined,
  AuditOutlined,
  SearchOutlined,
  DiffOutlined,
  CloudDownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import Layout from '@/shared/components/Layout';
import PlaceholderPage from '@/shared/components/PlaceholderPage';
import LoginPage from '@/modules/auth/pages/LoginPage';
import DashboardPage from '@/modules/dashboard/pages/DashboardPage';
import DeviceListPage from '@/modules/devices/pages/DeviceListPage';
import DeviceDetailPage from '@/modules/devices/pages/DeviceDetailPage';
import CoupleListPage from '@/modules/couples/pages/CoupleListPage';
import CoupleDetailPage from '@/modules/couples/pages/CoupleDetailPage';
import PairListPage from '@/modules/pairs/pages/PairListPage';
import PairDetailPage from '@/modules/pairs/pages/PairDetailPage';
import MapViewPage from '@/modules/map/pages/MapViewPage';
import TroubleshootingPage from '@/modules/troubleshooting/pages/TroubleshootingPage';
import SearchPage from '@/modules/search/pages/SearchPage';
import AuditTrailPage from '@/modules/audit_trail/pages/AuditTrailPage';
import ComparisonPage from '@/modules/comparison/pages/ComparisonPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="devices" element={<DeviceListPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="couples" element={<CoupleListPage />} />
        <Route path="couples/:id" element={<CoupleDetailPage />} />
        <Route path="pairs" element={<PairListPage />} />
        <Route path="pairs/:id" element={<PairDetailPage />} />
        <Route path="map" element={<MapViewPage />} />
        <Route path="troubleshooting" element={<TroubleshootingPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="audit" element={<AuditTrailPage />} />
        <Route path="comparison" element={<ComparisonPage />} />
        <Route path="ai" element={<PlaceholderPage title="AI Assistant" icon={<RobotOutlined />} />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="documents" element={<PlaceholderPage title="Documents" icon={<FileOutlined />} />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" icon={<BarChartOutlined />} />} />
        <Route path="backup" element={<PlaceholderPage title="Backup" icon={<CloudDownloadOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

4. docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_healthy
    networks:
      - navdashboard
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - navdashboard
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=eyJhIjoiYWM1ZmMwM2E5ZWE2NmU3OGFiNTlkN2NjMzk0NTc4ZGEiLCJ0IjoiMzAzNTZlYjAtMDhlOS00YTQ3LWE3NWQtYTcyOTM3YTUzODUyIiwicyI6IllUaGlaV1k0TnpjdE9UTTVNeTAwWmpZMkxUazBZakF0TXpaak9ESXhOelkwWVRFeSJ9
    networks:
      - navdashboard

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - navdashboard
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  db:
    image: imresamu/postgis:16-3.5
    environment:
      POSTGRES_DB: navdashboard
      POSTGRES_USER: navdashboard
      POSTGRES_PASSWORD: navdashboard
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - navdashboard
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U navdashboard -d navdashboard"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    networks:
      - navdashboard
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:

networks:
  navdashboard:
    driver: bridge

5. backend/requirements.txt

fastapi>=0.115.0
uvicorn[standard]>=0.32.0
sqlalchemy[asyncio]>=2.0.36
asyncpg>=0.30.0
alembic>=1.14.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
python-dotenv>=1.0.0
geoalchemy2>=0.17.0
shapely>=2.0.0
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
python-multipart>=0.0.18
pydantic[email]>=2.10
bcrypt==4.0.1


6. backend/Dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


Critical — need to match patterns exactly:



7. backend/core/database.py (need to see Base, SoftDeleteMixin, get_db)
import logging
from datetime import datetime
from typing import AsyncGenerator, Optional
from uuid import uuid4

from sqlalchemy import Column, DateTime, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from core.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.async_database_url,
    echo=(settings.ENVIRONMENT == "development"),
    pool_size=20,
    max_overflow=10,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    __abstract__ = True

    id: Mapped[uuid4] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class SoftDeleteMixin:
    @classmethod
    def not_deleted(cls):
        return cls.deleted_at.is_(None)


class CustomFieldsMixin:
    custom_fields = Column(JSONB, nullable=True, default=None)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def check_db_connection() -> bool:
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error("Database connection check failed: %s", e)
        return False


8. backend/core/config.py (need to see Settings class for MinIO config)
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    POSTGRES_USER: str = "navdashboard"
    POSTGRES_PASSWORD: str = "navdashboard_secret"
    POSTGRES_DB: str = "navdashboard_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT (defined now, used in Phase 2)
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440

    # App
    ENVIRONMENT: str = "development"
    APP_NAME: str = "NavDashboard"
    API_V1_PREFIX: str = "/api/v1"

    @property
    def async_database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()



9. backend/core/dependencies.py (need get_current_user, require_role signatures)
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_access_token
from core.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from modules.auth.models import User

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    from sqlalchemy import select

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.deleted_at is not None:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("Account disabled")

    return user


def require_role(*roles: str):
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return role_checker

10. backend/shared/audit.py (need record_audit signature)
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    changed_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


async def record_audit(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: UUID,
    user_id: UUID,
    old_values: dict | None = None,
    new_values: dict | None = None,
) -> None:
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changed_by=user_id,
        old_values=old_values,
        new_values=new_values,
    )
    db.add(entry)
    await db.flush()

11. backend/modules/devices/models.py (model pattern — does Base provide id?)
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin, CustomFieldsMixin


class Device(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "devices"

    serial_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    device_type: Mapped[str] = mapped_column(String(10), nullable=False)
    couple_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )  # FK added in Phase 6 when couples table exists
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="WORKING"
    )
    handling_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )  # FK added in Phase 5
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class DeviceStatusHistory(Base):
    __tablename__ = "device_status_history"

    device_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


Important — frontend patterns:

12. frontend/src/shared/api/client.ts
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    axiosInstance.get(url, { params }).then(res => res.data),
  post: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.post(url, data).then(res => res.data),
  put: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.put(url, data).then(res => res.data),
  del: <T>(url: string): Promise<T> =>
    axiosInstance.delete(url).then(res => res.data),
}

13. frontend/src/shared/types/common.ts
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type DeviceType = 'IU' | 'OU' | 'HC' | 'RF';
export type DeviceStatus = 'WORKING' | 'NOT_WORKING' | 'FAULTY';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
  custom_fields: Record<string, unknown> | null;
}




here are some extra things for you which were already ready 
## Option 2 (Prompt to extract) — 6 files

Use this prompt for each:

> **"Give me all SQLAlchemy Column definitions (column name, type, ForeignKey, nullable),summery and the class name. No methods needed."**

11. `backend/modules/personnel/models.py`
12. `backend/modules/troubleshooting/models.py`
13. `backend/modules/inventory/models.py`
14. `backend/modules/locations/models.py`
Here are the SQLAlchemy column definitions extracted from the requested files:

1. models.py
Class: Person
Summary: Represents a personnel member with their contact information and assigned role.

full_name: type String(200), nullable False
role: type String(100), nullable False
email: type String(255), nullable True
phone: type String(50), nullable True
notes: type Text, nullable True
( Inherits id, created_at, updated_at, deleted_at, custom_fields from mixins )
Class: AssignmentHistory
Summary: Tracks the history of assignment mappings between a person and a specific entity.

person_id: type UUID, ForeignKey("personnel.id"), nullable False
entity_type: type String(50), nullable False
entity_id: type UUID, nullable False
assigned_at: type DateTime(timezone=True), nullable False
unassigned_at: type DateTime(timezone=True), nullable True
( Inherits id, created_at, updated_at, deleted_at from Base )
2. models.py
Class: ErrorLog
Summary: Logs reported errors/issues related to devices, couples, or pairs along with their resolution status.

device_id: type PG_UUID(as_uuid=True), nullable True
couple_id: type PG_UUID(as_uuid=True), nullable True
pair_id: type PG_UUID(as_uuid=True), nullable True
error_type: type String(200), nullable False
severity: type String(20), nullable False
description: type Text, nullable False
reported_by: type PG_UUID(as_uuid=True), nullable True
reported_at: type DateTime(timezone=True), nullable False
resolved: type Boolean, nullable False
resolved_at: type DateTime(timezone=True), nullable True
resolved_by: type PG_UUID(as_uuid=True), nullable True
( Inherits id, created_at, updated_at, deleted_at, custom_fields from mixins )
Class: TroubleshootEntry
Summary: Records individual steps and actions taken to troubleshoot and resolve a specific logged error.

error_id: type PG_UUID(as_uuid=True), ForeignKey("error_logs.id"), nullable False
step_number: type Integer, nullable False
step_description: type Text, nullable False
action_taken: type Text, nullable True
resolution: type Text, nullable True
performed_by: type PG_UUID(as_uuid=True), nullable True
performed_at: type DateTime(timezone=True), nullable False
( Inherits id, created_at, updated_at, deleted_at, custom_fields from mixins )
3. models.py
Class: FittingMaterial
Summary: Represents materials used for fittings, potentially associated with a couple or kept as a template material.

couple_id: type UUID, nullable True
name: type String(200), nullable False
description: type Text, nullable True
quantity: type Integer, nullable False
unit: type String(50), nullable True
is_template: type Boolean, nullable False
( Inherits id, created_at, updated_at, deleted_at, custom_fields from mixins )
Class: MaterialTemplate
Summary: Stores reusable template combinations of materials as a JSON structure.

template_name: type String(200), nullable False
description: type Text, nullable True
materials: type JSONB, nullable False
( Inherits id, created_at, updated_at, deleted_at from Base )
4. models.py
Class: Location
Summary: Represents a physical, geographical point marked by latitude/longitude and spatial coordinates.

latitude: type Float, nullable False
longitude: type Float, nullable False
coordinate: type Geometry("POINT", srid=4326), nullable True
address_note: type String(500), nullable True
( Inherits id, created_at, updated_at, deleted_at from Base )
Class: LocationHistory
Summary: Historical audit table recording physical relocations of entities (like Couples) over time.

couple_id: type PG_UUID(as_uuid=True), nullable False
old_latitude: type Float, nullable False
old_longitude: type Float, nullable False
new_latitude: type Float, nullable False
new_longitude: type Float, nullable False
moved_at: type DateTime(timezone=True), nullable False
handled_by: type PG_UUID(as_uuid=True), nullable True
had_rf: type Boolean, nullable False
distance_meters: type Float, nullable True
fitting_materials_snapshot: type JSONB, nullable True
configuration_snapshot: type JSONB, nullable True
notes: type Text, nullable True
( Inherits id, created_at, updated_at, deleted_at, custom_fields from mixins )





> **"Give me the full file content"** (these are short utility files):

15. `frontend/src/shared/hooks/useDebounce.ts`
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

16. `frontend/src/shared/types/common.ts`
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

export type DeviceType = 'IU' | 'OU' | 'HC' | 'RF';
export type DeviceStatus = 'WORKING' | 'NOT_WORKING' | 'FAULTY';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
  custom_fields: Record<string, unknown> | null;
}


---

**That's 16 files total.** I can confidently infer `core/dependencies.py` :from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_access_token
from core.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    from modules.auth.models import User

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    from sqlalchemy import select

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.deleted_at is not None:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("Account disabled")

    return user


def require_role(*roles: str):
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return role_checker


`shared/api/client.ts` :
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const api = {
  get: <T>(url: string, params?: object): Promise<T> =>
    axiosInstance.get(url, { params }).then(res => res.data),
  post: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.post(url, data).then(res => res.data),
  put: <T>(url: string, data?: object): Promise<T> =>
    axiosInstance.put(url, data).then(res => res.data),
  del: <T>(url: string): Promise<T> =>
    axiosInstance.delete(url).then(res => res.data),
}

