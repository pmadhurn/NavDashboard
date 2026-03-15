These are files I'm either **replacing** or **querying against** — I need exact column names, imports, and structure:

### Backend — REPLACING (must have exact current content):
0. `NavDashboard/backend/requirements.txt`
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

1. `backend/main.py`
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

2. `backend/migrations/env.py`
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

### Backend — Database models (need exact table/column names for cross-module queries):

3. `backend/modules/devices/models.py`
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

4. `backend/modules/couples/models.py`
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
    


5. `backend/modules/pairs/models.py`
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

6. `backend/modules/troubleshooting/models.py`
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

8. `backend/modules/status/models.py`
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class StatusChangeLog(Base):
    __tablename__ = "status_change_logs"

    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), nullable=False, index=True
    )
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    

9. `backend/core/dependencies.py`
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

10. `backend/core/database.py`
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


### Frontend — REPLACING + API pattern:


11. `frontend/package.json`
{
  "name": "navdashboard-frontend",
  "version": "0.1.0",
  "private": true,
  "description": "",
  "license": "ISC",
  "author": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "antd": "^5.22.0",
    "@ant-design/icons": "^5.5.0",
    "axios": "^1.7.0",
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.60.0",
    "dayjs": "^1.11.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/leaflet": "^1.9.12",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.0"
  }
}


12. `frontend/src/shared/api/client.ts`
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


## AI PROMPT (5 files — just need props/exports)

For these, please ask an AI:

> **Prompt:** "For each of these 5 TypeScript React component files, give me ONLY the props interface (if any), the component function signature, and any named exports. No implementation details needed."

13. `frontend/src/shared/components/GlassCard.tsx`
14. `frontend/src/shared/components/PageHeader.tsx`
15. `frontend/src/shared/components/LoadingSpinner.tsx`
16. `frontend/src/shared/components/EmptyState.tsx`
17. `frontend/src/shared/components/StatusBadge.tsx`

---
i got you some extra : 

:
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