## Option 1 — Full files (must see completely):

**Backend — Core & Shared (5 files):**
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

2. `backend/core/dependencies.py`
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

3. `backend/core/exceptions.py`
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.requests import Request

logger = logging.getLogger(__name__)


class NotFoundException(Exception):
    def __init__(self, detail: str = "Resource not found"):
        self.detail = detail


class BadRequestException(Exception):
    def __init__(self, detail: str = "Bad request"):
        self.detail = detail


class UnauthorizedException(Exception):
    def __init__(self, detail: str = "Unauthorized"):
        self.detail = detail


class ForbiddenException(Exception):
    def __init__(self, detail: str = "Forbidden"):
        self.detail = detail


class ConflictException(Exception):
    def __init__(self, detail: str = "Conflict"):
        self.detail = detail


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundException)
    async def not_found_handler(request: Request, exc: NotFoundException) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": exc.detail})

    @app.exception_handler(BadRequestException)
    async def bad_request_handler(request: Request, exc: BadRequestException) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": exc.detail})

    @app.exception_handler(UnauthorizedException)
    async def unauthorized_handler(request: Request, exc: UnauthorizedException) -> JSONResponse:
        return JSONResponse(status_code=401, content={"detail": exc.detail})

    @app.exception_handler(ForbiddenException)
    async def forbidden_handler(request: Request, exc: ForbiddenException) -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": exc.detail})

    @app.exception_handler(ConflictException)
    async def conflict_handler(request: Request, exc: ConflictException) -> JSONResponse:
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def generic_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})

4. `backend/shared/audit.py`
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

5. `backend/shared/pagination.py`
from math import ceil
from typing import Generic, Type, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T", bound=BaseModel)


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    params: PaginationParams,
    response_schema: Type[T],
) -> PaginatedResponse[T]:
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (params.page - 1) * params.size
    paginated_query = query.offset(offset).limit(params.size)
    result = await db.execute(paginated_query)
    rows = result.all()

    items = []
    for row in rows:
        obj = row[0] if len(row) == 1 else row
        if hasattr(obj, "__dict__") and hasattr(obj, "__table__"):
            items.append(response_schema.model_validate(obj, from_attributes=True))
        else:
            items.append(response_schema.model_validate(obj._mapping))

    pages = ceil(total / params.size) if params.size > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )


**Backend — Files I'm REPLACING (2 files):**
6. `backend/main.py`
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

7. `backend/migrations/env.py`
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

24. `backend/requirements.txt`
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


**Backend — Models + Repos for status integration (6 files):**

8. `backend/modules/devices/models.py`
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

9. `backend/modules/devices/repository.py`
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.devices.models import Device, DeviceStatusHistory
from modules.devices.schemas import DeviceCreate, DeviceUpdate
from shared.filters import apply_filters


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Device]:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Device]:
    stmt = select(Device).where(Device.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Device, filters)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: DeviceCreate) -> Device:
    device = Device(
        serial_number=obj_in.serial_number,
        device_type=obj_in.device_type,
        status=obj_in.status,
        couple_id=obj_in.couple_id,
        handling_person_id=obj_in.handling_person_id,
        notes=obj_in.notes,
        custom_fields=obj_in.custom_fields,
        metadata_json=obj_in.metadata_json,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


async def update(db: AsyncSession, id: UUID, obj_in: DeviceUpdate) -> Device:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    if not device:
        return None  # type: ignore
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.flush()
    await db.refresh(device)
    return device


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Device]:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    if not device:
        return None
    from datetime import datetime, timezone

    device.deleted_at = datetime.now(timezone.utc)
    device.couple_id = None
    await db.flush()
    await db.refresh(device)
    return device


async def find_by_serial(db: AsyncSession, serial_number: str) -> Optional[Device]:
    stmt = select(Device).where(
        Device.serial_number == serial_number, Device.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def search_by_serial(db: AsyncSession, query: str) -> list[Device]:
    stmt = select(Device).where(
        Device.serial_number.ilike(f"%{query}%"), Device.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_stats(db: AsyncSession) -> dict:
    base = select(Device).where(Device.deleted_at.is_(None))

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar_one()

    type_result = await db.execute(
        select(Device.device_type, func.count())
        .where(Device.deleted_at.is_(None))
        .group_by(Device.device_type)
    )
    by_type = {row[0]: row[1] for row in type_result.all()}

    status_result = await db.execute(
        select(Device.status, func.count())
        .where(Device.deleted_at.is_(None))
        .group_by(Device.status)
    )
    by_status = {row[0]: row[1] for row in status_result.all()}

    return {"total": total, "by_type": by_type, "by_status": by_status}


async def get_status_history(
    db: AsyncSession, device_id: UUID
) -> list[DeviceStatusHistory]:
    stmt = (
        select(DeviceStatusHistory)
        .where(DeviceStatusHistory.device_id == device_id)
        .order_by(DeviceStatusHistory.changed_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_status_history(
    db: AsyncSession, entry: DeviceStatusHistory
) -> DeviceStatusHistory:
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(
        select(Device).where(Device.deleted_at.is_(None)).subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()

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
    

11. `backend/modules/couples/repository.py`
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import Couple


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Couple]:
    stmt = select(Couple).where(Couple.id == id, Couple.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Couple]:
    stmt = select(Couple).where(Couple.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Couple, filters)
    stmt = stmt.order_by(Couple.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: dict) -> Couple:
    couple = Couple(**obj_in)
    db.add(couple)
    await db.flush()
    await db.refresh(couple)
    return couple


async def update(
    db: AsyncSession, id: UUID, obj_in: dict
) -> Optional[Couple]:
    couple = await get_by_id(db, id)
    if not couple:
        return None
    for field, value in obj_in.items():
        setattr(couple, field, value)
    couple.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(couple)
    return couple


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Couple]:
    couple = await get_by_id(db, id)
    if not couple:
        return None
    couple.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(couple)
    return couple


async def get_by_pair_id(db: AsyncSession, pair_id: UUID) -> list[Couple]:
    stmt = select(Couple).where(
        Couple.pair_id == pair_id, Couple.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_map_data(db: AsyncSession) -> list[dict]:
    from modules.locations.models import Location

    stmt = (
        select(
            Couple.id,
            Couple.name,
            Location.latitude,
            Location.longitude,
            Couple.status,
            Couple.has_rf,
        )
        .join(Location, Couple.location_id == Location.id)
        .where(Couple.deleted_at.is_(None))
        .where(Couple.location_id.isnot(None))
    )
    result = await db.execute(stmt)
    return [
        {
            "couple_id": row[0],
            "couple_name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "status": row[4],
            "has_rf": row[5],
        }
        for row in result.all()
    ]


async def count_all(db: AsyncSession) -> int:
    stmt = (
        select(func.count())
        .select_from(Couple)
        .where(Couple.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


12. `backend/modules/pairs/models.py`
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

13. `backend/modules/pairs/repository.py`
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import Pair


async def get_by_id(db: AsyncSession, pair_id: UUID) -> Optional[Pair]:
    stmt = select(Pair).where(Pair.id == pair_id, Pair.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Pair]:
    stmt = select(Pair).where(Pair.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Pair, filters)
    stmt = stmt.order_by(Pair.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: dict) -> Pair:
    pair = Pair(**obj_in)
    db.add(pair)
    await db.flush()
    await db.refresh(pair)
    return pair


async def update(db: AsyncSession, pair_id: UUID, obj_in: dict) -> Optional[Pair]:
    pair = await get_by_id(db, pair_id)
    if not pair:
        return None
    for key, value in obj_in.items():
        setattr(pair, key, value)
    await db.flush()
    await db.refresh(pair)
    return pair


async def soft_delete(db: AsyncSession, pair_id: UUID) -> Optional[Pair]:
    pair = await get_by_id(db, pair_id)
    if not pair:
        return None
    pair.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(pair)
    return pair


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Pair).where(Pair.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_stats(db: AsyncSession) -> dict:
    total = await count_all(db)
    stmt = (
        select(Pair.status, func.count())
        .where(Pair.deleted_at.is_(None))
        .group_by(Pair.status)
    )
    result = await db.execute(stmt)
    by_status = {row[0]: row[1] for row in result.all()}
    return {"total": total, "by_status": by_status}



**Backend — Personnel for name lookups (2 files):**
14. `backend/modules/personnel/models.py`
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

15. `backend/modules/personnel/repository.py`
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import AssignmentHistory, Person
from .schemas import PersonCreate, PersonUpdate


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Person]:
    stmt = select(Person).where(Person.id == id, Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession, skip: int = 0, limit: int = 100, filters: dict | None = None
) -> list[Person]:
    stmt = select(Person).where(Person.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Person, filters)
    stmt = stmt.order_by(Person.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: PersonCreate) -> Person:
    person = Person(**obj_in.model_dump())
    db.add(person)
    await db.flush()
    await db.refresh(person)
    return person


async def update(db: AsyncSession, id: UUID, obj_in: PersonUpdate) -> Optional[Person]:
    person = await get_by_id(db, id)
    if not person:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    person.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(person)
    return person


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Person]:
    person = await get_by_id(db, id)
    if not person:
        return None
    person.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(person)
    return person


async def search_by_name(db: AsyncSession, query: str) -> list[Person]:
    stmt = (
        select(Person)
        .where(Person.deleted_at.is_(None))
        .where(Person.full_name.ilike(f"%{query}%"))
        .order_by(Person.full_name)
        .limit(20)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_assignments(db: AsyncSession, person_id: UUID) -> list[AssignmentHistory]:
    stmt = (
        select(AssignmentHistory)
        .where(AssignmentHistory.person_id == person_id)
        .order_by(AssignmentHistory.assigned_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_assignment(
    db: AsyncSession, person_id: UUID, entity_type: str, entity_id: UUID
) -> AssignmentHistory:
    assignment = AssignmentHistory(
        person_id=person_id,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def end_assignment(
    db: AsyncSession, person_id: UUID, entity_type: str, entity_id: UUID
) -> Optional[AssignmentHistory]:
    stmt = select(AssignmentHistory).where(
        AssignmentHistory.person_id == person_id,
        AssignmentHistory.entity_type == entity_type,
        AssignmentHistory.entity_id == entity_id,
        AssignmentHistory.unassigned_at.is_(None),
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        return None
    assignment.unassigned_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Person).where(Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()


**Frontend — File I'm REPLACING (1 file):**
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
        <Route path="troubleshooting" element={<PlaceholderPage title="Troubleshooting" icon={<ToolOutlined />} />} />
        <Route path="ai" element={<PlaceholderPage title="AI Assistant" icon={<RobotOutlined />} />} />
        <Route path="location-history" element={<PlaceholderPage title="Location History" icon={<HistoryOutlined />} />} />
        <Route path="documents" element={<PlaceholderPage title="Documents" icon={<FileOutlined />} />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" icon={<BarChartOutlined />} />} />
        <Route path="audit" element={<PlaceholderPage title="Audit Trail" icon={<AuditOutlined />} />} />
        <Route path="search" element={<PlaceholderPage title="Search" icon={<SearchOutlined />} />} />
        <Route path="comparison" element={<PlaceholderPage title="Comparison" icon={<DiffOutlined />} />} />
        <Route path="backup" element={<PlaceholderPage title="Backup" icon={<CloudDownloadOutlined />} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" icon={<SettingOutlined />} />} />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


**Frontend — API + Types (2 files):**


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

18. `frontend/src/shared/types/common.ts`
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

## Option 2 — AI prompts for remaining files:

**Prompt 1:** For each of these frontend component files, give me ONLY the TypeScript props interface and the export statement (default vs named):
- `frontend/src/shared/components/GlassCard.tsx`
- `frontend/src/shared/components/GlassModal.tsx`
- `frontend/src/shared/components/GlassInput.tsx`
- `frontend/src/shared/components/GlassButton.tsx`
- `frontend/src/shared/components/PageHeader.tsx`
- `frontend/src/shared/components/DataTable.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/shared/components/EmptyState.tsx`
- `frontend/src/shared/components/LoadingSpinner.tsx`

**Prompt 2:** Give me all exported function signatures (name, params, return type) from:
- `frontend/src/shared/utils/colors.ts`
- `frontend/src/shared/utils/formatters.ts`

**Prompt 3:** Give me the `filters.py` shared backend file content:
- `backend/shared/filters.py`

---

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassModal.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassCard.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassInput.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/GlassButton.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/PageHeader.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/DataTable.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/StatusBadge.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/EmptyState.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/utils/colors.ts)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/components/LoadingSpinner.tsx)

Read [](file:///Users/madhur/Projects/NavDashboard/frontend/src/shared/utils/formatters.ts)

Read [](file:///Users/madhur/Projects/NavDashboard/backend/shared/filters.py)

Here are the requested details and summaries for the requested files.

### Prompt 1: Frontend Components

**1. GlassCard.tsx**

**Summary:** A reusable card component styled with a "glassmorphism" effect (translucency and blur). It supports hover effects, custom padding, click handlers, and accent side borders.

```typescript
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

export default function GlassCard({ ... }: GlassCardProps)
```

**2. GlassModal.tsx**

**Summary:** A modal dialog wrapper based on Ant Design's `<Modal>`, customized to fit the application's dark glassmorphism theme, with integrated blur backdrops and styled borders.

```typescript
interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number | string;
  closable?: boolean;
}

export default function GlassModal({ ... }: GlassModalProps)
```

**3. GlassInput.tsx**

**Summary:** A versatile input component that wraps Ant Design inputs (text, password, textarea) and applies custom glass-themed styling (translucent background, muted borders) alongside error message support.

```typescript
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

export default function GlassInput({ ... }: GlassInputProps)
```

**4. GlassButton.tsx**

**Summary:** A themed button wrapper for Ant Design's `<Button>` that applies glass-like visual treatments for several variants (`primary`, `secondary`, `danger`, `ghost`).

```typescript
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

export default function GlassButton({ ... }: GlassButtonProps)
```

**5. PageHeader.tsx**

**Summary:** Displays the page title, an optional subtitle, breadcrumbs, and extra action buttons at the top of a page. It also integrates with the global UI store to dynamically set the document/page title.

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; path?: string }[];
  actions?: React.ReactNode;
}

export default function PageHeader({ ... }: PageHeaderProps)
```

**6. DataTable.tsx**

**Summary:** A generic, styled abstraction over Ant Design's `<Table>`. It cleanly handles pagination, row selection, row clicks, loading states, and custom empty states for tabular data.

```typescript
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

export default function DataTable<T extends object>({ ... }: DataTableProps<T>)
```

**7. StatusBadge.tsx**

**Summary:** A small pill-styled badge to visually indicate the operational state of entities (e.g. WORKING, FAULTY). WORKING statuses have an animated pulsing dot.

```typescript
interface StatusBadgeProps {
  status: 'WORKING' | 'NOT_WORKING' | 'FAULTY';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ ... }: StatusBadgeProps)
```

**8. EmptyState.tsx**

**Summary:** A fallback UI placeholder used when no content/data is available. Displays an icon, title, optional description, and an optional call-to-action block.

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ ... }: EmptyStateProps)
```

**9. LoadingSpinner.tsx**

**Summary:** A centralized loading indicator using an Ant Design spinner. It can be rendered inline with optional text, or as a full-page overlay that blocks out the entire screen.

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ ... }: LoadingSpinnerProps)
```

---

### Prompt 2: Utility Function Signatures

**1. colors.ts**
**Summary:** A collection of helper methods that map string values (like statuses, severities, device types, or roles) to consistent theme color codes, and features an alpha transparency converter for hex colors.

* `export function getStatusColor(status: string): string`
* `export function getSeverityColor(severity: string): string`
* `export function getDeviceTypeColor(type: string): string`
* `export function getRoleColor(role: string): string`
* `export function hexToRgba(hex: string, alpha: number): string`

**2. formatters.ts**
**Summary:** Contains shared formatting methods for transforming raw data into user-friendly strings using `dayjs` for dates, and typical javascript formatters for sizes, coordinates, and strings.

* `export function formatDate(date: string | Date | null): string`
* `export function formatDateTime(date: string | Date | null): string`
* `export function formatRelativeTime(date: string | Date): string`
* `export function truncateText(text: string, maxLength: number): string`
* `export function formatSerialNumber(serial: string): string`
* `export function formatCoordinates(lat: number, lng: number): string`
* `export function formatFileSize(bytes: number): string`

---

### Prompt 3: Backend Filters File Content

**filters.py**
**Summary:** Provides an `apply_filters` helper function that dynamically constructs map-based SQLAlchemy queries. It parses a dictionary of query parameters into operator fields (like `__contains`, `__gte`, `__in`) allowing consistent filtering on various SQLAlchemy models.

```python
from typing import Any

from sqlalchemy import Select


def apply_filters(
    query: Select,
    model: Any,
    filters: dict[str, Any],
) -> Select:
    for key, value in filters.items():
        if value is None:
            continue

        parts = key.split("__")
        field_name = parts[0]
        suffix = parts[1] if len(parts) > 1 else None

        column = getattr(model, field_name, None)
        if column is None:
            continue

        if suffix is None:
            query = query.where(column == value)
        elif suffix == "contains":
            query = query.where(column.ilike(f"%{value}%"))
        elif suffix == "gte":
            query = query.where(column >= value)
        elif suffix == "lte":
            query = query.where(column <= value)
        elif suffix == "in":
            query = query.where(column.in_(value))
        elif suffix == "isnull":
            if value:
                query = query.where(column.is_(None))
            else:
                query = query.where(column.isnot(None))

    return query
```