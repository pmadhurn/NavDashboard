I need to see several files to generate Phase 13 correctly. Let me organize my requests:

## Full Files Needed (Option 1):

### Core Infrastructure (6 files)
1. `backend/core/database.py`
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

2. `backend/core/security.py`
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: UUID, role: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    payload = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

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
from modules.ai_assistant.router import router as ai_router

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
    version="0.12.0",
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
app.include_router(ai_router, prefix=settings.API_V1_PREFIX + "/ai", tags=["AI Assistant"])


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
        "version": "0.12.0",
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
from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument  # noqa

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

6. `frontend/src/app/routes.tsx`

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
import AIChatPage from '@/modules/ai_chat/pages/AIChatPage';

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
        <Route path="ai" element={<AIChatPage />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

### Auth Module (5 files — needed for settings user management delegation)
7. `backend/modules/auth/models.py`
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


8. `backend/modules/auth/schemas.py`
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=100)
    role: str = "VIEWER"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    custom_fields: Optional[dict] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    custom_fields: Optional[dict] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6)

9. `backend/modules/auth/repository.py`
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.models import User
from modules.auth.schemas import UserCreate, UserUpdate
from core.security import hash_password
from shared.filters import apply_filters


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[User]:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: Optional[dict] = None,
) -> list[User]:
    stmt = select(User).where(User.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, User, filters)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: UserCreate) -> User:
    user = User(
        email=obj_in.email,
        username=obj_in.username,
        hashed_password=hash_password(obj_in.password),
        full_name=obj_in.full_name,
        role=obj_in.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, id: UUID, obj_in: UserUpdate) -> User:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return None  # type: ignore[return-value]
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def soft_delete(db: AsyncSession, id: UUID) -> User:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return None  # type: ignore[return-value]
    user.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def find_by_email(db: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_by_username(db: AsyncSession, username: str) -> Optional[User]:
    stmt = select(User).where(User.username == username, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def count_users(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()

10. `backend/modules/auth/service.py`
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth import repository
from modules.auth.models import User
from modules.auth.schemas import UserCreate, UserUpdate, UserResponse, TokenResponse
from core.security import verify_password, create_access_token, hash_password
from core.exceptions import (
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


async def register_user(db: AsyncSession, user_in: UserCreate, current_user_role: str) -> User:
    if current_user_role != "ADMIN":
        raise ForbiddenException("Only admins can create users")

    existing_email = await repository.find_by_email(db, user_in.email)
    if existing_email:
        raise ConflictException("Email already registered")

    existing_username = await repository.find_by_username(db, user_in.username)
    if existing_username:
        raise ConflictException("Username already taken")

    user = await repository.create(db, user_in)
    await record_audit(
        db,
        entity_type="user",
        entity_id=user.id,
        action="CREATE",
        changes={"email": user.email, "username": user.username, "role": user.role},
    )
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> TokenResponse:
    user = await repository.find_by_email(db, email)
    if not user:
        raise UnauthorizedException("Invalid email or password")

    if not verify_password(password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)

    user_response = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, user=user_response)


async def get_profile(db: AsyncSession, user_id: UUID) -> User:
    user = await repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    return user


async def update_profile(db: AsyncSession, user_id: UUID, user_in: UserUpdate) -> User:
    user = await repository.update(db, user_id, user_in)
    if not user:
        raise NotFoundException("User not found")
    return user


async def change_password(
    db: AsyncSession, user_id: UUID, old_password: str, new_password: str
) -> None:
    user = await repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")

    if not verify_password(old_password, user.hashed_password):
        raise UnauthorizedException("Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def ensure_default_admin(db: AsyncSession) -> None:
    count = await repository.count_users(db)
    if count == 0:
        admin_in = UserCreate(
            email="admin@navdashboard.com",
            username="Madhur",
            password="admin123",
            full_name="Madhur",
            role="ADMIN",
        )
        await repository.create(db, admin_in)
        logger.warning("Default admin account created. Change the password immediately!")
    else:
        logger.info("Users exist, skipping default admin creation.")

11. `backend/modules/auth/router.py`
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from modules.auth.models import User
from modules.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    PasswordChange,
)
from modules.auth import service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.authenticate(db, body.email, body.password)


@router.post("/register", response_model=UserResponse)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.register_user(db, body, current_user.role)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_profile(db, current_user.id, body)


@router.put("/me/password")
async def change_password(
    body: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.change_password(db, current_user.id, body.old_password, body.new_password)
    return {"detail": "Password changed successfully"}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    from modules.auth import repository
    return await repository.get_multi(db, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.get_profile(db, user_id)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.update_profile(db, user_id, body)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    from modules.auth import repository
    user = await repository.soft_delete(db, user_id)
    if not user:
        from core.exceptions import NotFoundException
        raise NotFoundException("User not found")
    return {"detail": "User deleted"}

### Models for Seed Script (7 files)
12. `backend/modules/devices/models.py`
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

13. `backend/modules/couples/models.py`
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
    


14. `backend/modules/pairs/models.py`
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

15. `backend/modules/personnel/models.py`
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

16. `backend/modules/inventory/models.py`
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

17. `backend/modules/troubleshooting/models.py`
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

18. `backend/modules/locations/models.py`
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


### Frontend Key Files (3 files)
19. `frontend/src/shared/api/client.ts`
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

20. `frontend/src/shared/stores/authStore.ts`
import { create } from 'zustand'

interface User {
  id: string
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('access_token', token)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ token: null, user: null, isAuthenticated: false })
  },

  initialize: () => {
    const token = localStorage.getItem('access_token')
    if (token && !get().isAuthenticated) {
      set({ token, isAuthenticated: true })
    }
  },
}))

21. `frontend/src/modules/map/components/LocationTrail.tsx`
    import React, { useMemo } from 'react'
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import type { LocationHistory } from '@/shared/types/locations'
import { formatDateTime } from '@/shared/utils/formatters'

interface LocationTrailProps {
  history: LocationHistory[]
  currentLocation: { latitude: number; longitude: number } | null
}

export default function LocationTrail({ history, currentLocation }: LocationTrailProps) {
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime()
    )
  }, [history])

  const trailPoints = useMemo(() => {
    const points: { lat: number; lng: number; date: string; distance: number | null; opacity: number }[] = []

    sortedHistory.forEach((h, idx) => {
      if (idx === 0) {
        points.push({
          lat: h.old_latitude,
          lng: h.old_longitude,
          date: h.moved_at,
          distance: null,
          opacity: Math.max(0.3, (idx + 1) / (sortedHistory.length + 1)),
        })
      }
      points.push({
        lat: h.new_latitude,
        lng: h.new_longitude,
        date: h.moved_at,
        distance: h.distance_meters,
        opacity: Math.max(0.3, (idx + 1) / sortedHistory.length),
      })
    })

    return points
  }, [sortedHistory])

  const polylinePositions = useMemo(() => {
    const positions: [number, number][] = trailPoints.map((p) => [p.lat, p.lng])

    if (currentLocation) {
      positions.push([currentLocation.latitude, currentLocation.longitude])
    }

    return positions
  }, [trailPoints, currentLocation])

  if (sortedHistory.length === 0) return null

  return (
    <>
      {/* Polyline connecting all points */}
      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: '#7C7C7C',
            weight: 2,
            dashArray: '6, 8',
            opacity: 0.7,
          }}
        />
      )}

      {/* Historical point markers */}
      {trailPoints.map((point, idx) => (
        <CircleMarker
          key={`trail-point-${idx}`}
          center={[point.lat, point.lng]}
          radius={4}
          pathOptions={{
            color: '#7C7C7C',
            fillColor: '#7C7C7C',
            fillOpacity: point.opacity,
            opacity: point.opacity,
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 500 }}>{formatDateTime(point.date)}</div>
              {point.distance !== null && (
                <div style={{ color: '#999', marginTop: 2 }}>
                  Distance: {point.distance.toFixed(1)}m
                </div>
              )}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}


## Prompt-Based Requests (Option 2):

22. **For all shared components** — please give me output of:
> "Show me just the **Props interface / type definition and the function signature** (first 5-10 lines of the component) for each of these files: `GlassCard.tsx`, `GlassButton.tsx`, `GlassInput.tsx`, `GlassModal.tsx`, `PageHeader.tsx`, `DataTable.tsx`, `EmptyState.tsx`, `StatusBadge.tsx`, `ConfirmDialog.tsx`, `LoadingSpinner.tsx`"
Searched for files matching `**/frontend/src/shared/**/*.tsx`, 14 matches

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassCard.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassButton.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassModal.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassInput.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/EmptyState.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/PageHeader.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/DataTable.tsx#1-1), lines 1 to 45

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/StatusBadge.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/ConfirmDialog.tsx#1-1), lines 1 to 30

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/LoadingSpinner.tsx#1-1), lines 1 to 30

Here are the `Props` interfaces and function signatures for each of the requested shared components:

### 1. GlassCard.tsx
```tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  accentColor?: string;
  fullHeight?: boolean;
  style?: React.CSSProperties;
}

export default function GlassCard({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  onClick,
  accentColor,
  fullHeight = false,
  style,
}: GlassCardProps)
```

### 2. GlassButton.tsx
```tsx
interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  htmlType?: 'button' | 'submit';
}

export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  onClick,
  fullWidth = false,
}: GlassButtonProps)
```

### 3. GlassInput.tsx
```tsx
interface GlassInputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'textarea';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function GlassInput({
  type = 'text',
  placeholder,
  value,
  onChange,
  prefix,
  suffix,
  error,
  disabled = false,
}: GlassInputProps)
```

### 4. GlassModal.tsx
```tsx
interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  closable?: boolean;
}

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  closable = true,
}: GlassModalProps)
```

### 5. PageHeader.tsx
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps)
```

### 6. DataTable.tsx
```tsx
interface DataTableProps<T> {
  columns: ColumnsType<T>;
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRowClick?: (record: T) => void;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[]) => void;
  emptyText?: string;
  rowKey?: string | ((record: T) => string);
}

export default function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pagination,
  onRowClick,
  selectedRowKeys,
  onSelectionChange,
  emptyText = 'No data available',
  rowKey = 'id',
}: DataTableProps<T>)
```

### 7. EmptyState.tsx
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps)
```

### 8. StatusBadge.tsx
```tsx
interface StatusBadgeProps {
  status: 'WORKING' | 'NOT_WORKING' | 'FAULTY';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ 
  status, 
  size = 'md' 
}: StatusBadgeProps)
```

### 9. ConfirmDialog.tsx
```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: ConfirmDialogProps)
```

### 10. LoadingSpinner.tsx
```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  text,
  fullPage = false,
}: LoadingSpinnerProps)
```




23. `backend/shared/audit.py` — full file
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




That's **21 full files + 1 prompt + 1 more full file (audit.py)** = 22 total requests. Please share them whenever ready — I can take them in batches!
