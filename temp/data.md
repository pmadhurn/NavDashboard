
## Option 1 (Full files needed):

**Backend Core + Modified Files:**
1. `backend/core/config.py`
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

2. `backend/core/database.py`
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


3. `backend/core/dependencies.py`
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

4. `backend/main.py`
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
from modules.documents.router import router as documents_router
from modules.backup.router import router as backup_router
from modules.reports.router import router as reports_router

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
    version="0.11.2",
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
app.include_router(documents_router, prefix=settings.API_V1_PREFIX + "/documents", tags=["documents"])
app.include_router(backup_router, prefix=settings.API_V1_PREFIX + "/backup", tags=["backup"])
app.include_router(reports_router, prefix=settings.API_V1_PREFIX + "/reports", tags=["reports"])


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
        "version": "0.11.2",
    }



5. `backend/migrations/env.py`
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
from modules.documents.models import Document  # noqa

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

6. `backend/requirements.txt`
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
minio
openpyxl
reportlab
xlsxwriter

7. `backend/shared/audit.py`
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


**All model files (need field names for embeddings + column pattern consistency):**
8. `backend/modules/auth/models.py`
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin, CustomFieldsMixin


class User(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="VIEWER", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

9. `backend/modules/devices/models.py`
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

10. `backend/modules/couples/models.py`
from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class Couple(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "couples"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    pair_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    has_rf: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="WORKING")
    handling_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("personnel.id"),
        nullable=True,
    )
    location_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("locations.id"),
        nullable=True,
    )
    configuration: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    handling_person = relationship(
        "Person", foreign_keys=[handling_person_id], lazy="selectin"
    )
    location = relationship(
        "Location", foreign_keys=[location_id], lazy="selectin"
    )
    

11. `backend/modules/pairs/models.py`
from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class Pair(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "pairs"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="WORKING")
    status_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    handling_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

12. `backend/modules/troubleshooting/models.py`
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class ErrorLog(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "error_logs"

    device_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    couple_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    pair_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    error_type: Mapped[str] = mapped_column(String(200), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reported_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )


class TroubleshootEntry(Base, CustomFieldsMixin):
    __tablename__ = "troubleshoot_entries"

    error_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("error_logs.id"),
        index=True,
        nullable=False,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_description: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performed_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

13. `backend/modules/personnel/models.py`
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class Person(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "personnel"

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AssignmentHistory(Base):
    __tablename__ = "assignment_history"

    person_id: Mapped[UUID] = mapped_column(
        ForeignKey("personnel.id"), index=True, nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(index=True, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    unassigned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

14. `backend/modules/inventory/models.py`
from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class FittingMaterial(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "fitting_materials"

    couple_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class MaterialTemplate(Base):
    __tablename__ = "material_templates"

    template_name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    materials: Mapped[dict] = mapped_column(JSONB, nullable=False)

15. `backend/modules/locations/models.py`
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, String, Text, Boolean, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin


class Location(Base):
    __tablename__ = "locations"

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    coordinate = Column(Geometry("POINT", srid=4326), nullable=True)
    address_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class LocationHistory(Base, CustomFieldsMixin):
    __tablename__ = "location_history"

    couple_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), index=True, nullable=False
    )
    old_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    old_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    new_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    new_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    moved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    handled_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    had_rf: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fitting_materials_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    configuration_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

**Frontend + Nginx modified files:**
16. `frontend/src/app/routes.tsx`
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
import DocumentsPage from '@/modules/documents/pages/DocumentsPage';
import BackupPage from '@/modules/backup/pages/BackupPage';
import ReportsPage from '@/modules/reports/pages/ReportsPage';

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
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="ai" element={<PlaceholderPage title="AI Assistant" icon={<RobotOutlined />} />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

17. `frontend/src/shared/api/client.ts`
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

18. `nginx/default.conf`
server {
    listen 80;
    server_name localhost;
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Extended timeouts for backup/restore/export/import/reports
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /docs {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    location /redoc {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
## Option 2 (Prompt-based):

19. For these shared components, just give me the **TypeScript props interface / type definition** for each:
   - `GlassCard`, `GlassButton`, `GlassInput`, `GlassModal`, `PageHeader`, `LoadingSpinner`, `EmptyState`, `ConfirmDialog`

20. From `frontend/src/shared/components/Sidebar.tsx` — **does it already have an "AI" nav link pointing to `/ai`?** Just yes/no and the icon used.

21. From `docker-compose.yml` — **what is the backend service command, and are there any extra_hosts or OLLAMA env vars already defined?**

22. From `database/init/01_extensions.sql` — **does it already include `CREATE EXTENSION IF NOT EXISTS vector`?**

Please provide these and I'll generate all 22 files in one shot!

prompt based :
Here are the answers to your questions:

19. TypeScript Props Interfaces / Type Definitions:

GlassCard

GlassButton

GlassInput

GlassModal

PageHeader

LoadingSpinner

EmptyState

ConfirmDialog

20. Sidebar AI Link:
Yes. frontend/src/shared/components/Sidebar.tsx already has an AI section pointing to /ai. It uses the <RobotOutlined /> icon.

21. Backend service in docker-compose.yml:

Command: There is no specific command: defined for the backend service in docker-compose.yml. It relies on the command inside the Dockerfile.
extra_hosts / OLLAMA: There are no extra_hosts defined, nor are there any OLLAMA environment variables defined for the backend service (only an env_file: - ./backend/.env).
22. Vector Extension:
Yes. database/init/01_extensions.sql#L4 already includes CREATE EXTENSION IF NOT EXISTS vector;.