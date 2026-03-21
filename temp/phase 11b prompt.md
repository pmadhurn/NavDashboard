

Now here's the **Phase 11b prompt**:

```markdown
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — PHASE 11b: DOCUMENTS + BACKUP + REPORTS
# ═══════════════════════════════════════════════════════════════

## PROJECT STATE (DO NOT REGENERATE — ALREADY EXISTS)

NavDashboard is a LiFi device management system. Phases 1–10 and
Phase 11a are complete and working.

**Backend modules that exist and are working:**
auth, devices, couples, pairs, locations, personnel, inventory,
troubleshooting, status, dashboard, search, audit_trail, comparison

**Database tables (15 — no new tables added in 11a):**
users, audit_logs, devices, device_status_history, personnel,
assignment_history, fitting_materials, material_templates, locations,
location_history, couples, pairs, error_logs, troubleshoot_entries,
status_change_logs

**Docker services running:**
nginx (:80 reverse proxy), frontend (:3000), backend (:8000),
db (imresamu/postgis:16-3.5), redis (:6379)

**MinIO is defined in docker-compose.yml but NOT yet started.**
Phase 11b will activate it.

**Current main.py router includes (KEEP ALL):**
```python
from modules.auth.router import router as auth_router
from modules.devices.router import router as devices_router
from modules.couples.router import router as couples_router
from modules.pairs.router import router as pairs_router
from modules.locations.router import router as locations_router
from modules.personnel.router import router as personnel_router
from modules.inventory.router import router as inventory_router
from modules.troubleshooting.router import router as troubleshooting_router
from modules.status.router import router as status_router
from modules.dashboard.router import router as dashboard_router
from modules.search.router import router as search_router
from modules.audit_trail.router import router as audit_router
from modules.comparison.router import router as comparison_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(devices_router, prefix="/api/v1/devices", tags=["Devices"])
app.include_router(couples_router, prefix="/api/v1/couples", tags=["Couples"])
app.include_router(pairs_router, prefix="/api/v1/pairs", tags=["Pairs"])
app.include_router(locations_router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(personnel_router, prefix="/api/v1/personnel", tags=["Personnel"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(troubleshooting_router, prefix="/api/v1/troubleshooting", tags=["Troubleshooting"])
app.include_router(status_router, prefix="/api/v1/status", tags=["Status"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(search_router, prefix="/api/v1/search", tags=["Search"])
app.include_router(audit_router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(comparison_router, prefix="/api/v1/comparison", tags=["Comparison"])
```

**Current migrations/env.py model imports (KEEP ALL):**
```python
from shared.audit import AuditLog
from modules.auth.models import User
from modules.devices.models import Device, DeviceStatusHistory
from modules.personnel.models import Person, AssignmentHistory
from modules.inventory.models import FittingMaterial, MaterialTemplate
from modules.locations.models import Location, LocationHistory
from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
from modules.status.models import StatusChangeLog
```

**Current routes.tsx live routes (KEEP ALL):**
- `/` → DashboardPage
- `/login` → LoginPage
- `/devices` → DeviceListPage
- `/devices/:id` → DeviceDetailPage
- `/couples` → CoupleListPage
- `/couples/:id` → CoupleDetailPage
- `/pairs` → PairListPage
- `/pairs/:id` → PairDetailPage
- `/map` → MapViewPage
- `/troubleshooting` → TroubleshootingPage
- `/search` → SearchPage
- `/audit` → AuditTrailPage
- `/comparison` → ComparisonPage
- `/documents`, `/backup`, `/reports`, `/ai`, `/location-history`, `/settings` → PlaceholderPage

**Existing shared component import style (IMPORTANT):**
All shared components use `export default`. Import them as:
```typescript
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import PageHeader from '@/shared/components/PageHeader';
import DataTable from '@/shared/components/DataTable';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import GlassModal from '@/shared/components/GlassModal';
import GlassInput from '@/shared/components/GlassInput';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import StatusBadge from '@/shared/components/StatusBadge';
```
Do NOT use `{ GlassCard }` named imports — they will fail.

**Existing frontend patterns:**
```typescript
// Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

// Pages use Ant Design: Row, Col, Select, DatePicker, Tag, Space, Tabs, Upload, Button, Table, message, Progress, Checkbox, Radio, etc.
import { Row, Col, Select, Tag, Space, message } from 'antd';
```

---

## EXISTING BACKEND PATTERNS (follow exactly)

**Router:**
```python
from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.dependencies import get_current_user, require_role
from modules.auth.models import User

router = APIRouter()
```

**Repository — standard CRUD:**
```python
async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Model]:
    result = await db.execute(select(Model).where(Model.id == id, Model.deleted_at.is_(None)))
    return result.scalar_one_or_none()
```

**Service — calls repository, records audit:**
```python
from shared.audit import record_audit
```

---

## COLOR PALETTE (exact values)

- Background: `#0A0A0A`, Cards: `#141414`, Secondary: `#1A1A1A`
- Text primary: `#F2F2F2`, secondary: `#B8B8B8`, muted: `#7A7A7A`
- Borders: `#242424`, Accent: `#2E2E2E`
- Status: Working `#5F8F6B`, Not Working `#B68A3C`, Faulty `#9B3E3E`
- Glass: `background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06);`
- Success: `#5F8F6B`, Warning: `#B68A3C`, Error: `#9B3E3E`, Info: `#6E7E8A`

---

## FILES TO GENERATE (35 total)

### Backend — Documents Module (7 files)
1. `NavDashboard/backend/modules/documents/__init__.py`
2. `NavDashboard/backend/modules/documents/models.py`
3. `NavDashboard/backend/modules/documents/schemas.py`
4. `NavDashboard/backend/modules/documents/repository.py`
5. `NavDashboard/backend/modules/documents/service.py`
6. `NavDashboard/backend/modules/documents/router.py`
7. `NavDashboard/backend/modules/documents/storage.py`

### Backend — Backup Module (9 files)
8. `NavDashboard/backend/modules/backup/__init__.py`
9. `NavDashboard/backend/modules/backup/models.py`
10. `NavDashboard/backend/modules/backup/schemas.py`
11. `NavDashboard/backend/modules/backup/repository.py`
12. `NavDashboard/backend/modules/backup/service.py`
13. `NavDashboard/backend/modules/backup/router.py`
14. `NavDashboard/backend/modules/backup/exporter.py`
15. `NavDashboard/backend/modules/backup/importer.py`
16. `NavDashboard/backend/modules/backup/pg_dump_handler.py`

### Backend — Reports Module (8 files)
17. `NavDashboard/backend/modules/reports/__init__.py`
18. `NavDashboard/backend/modules/reports/models.py`
19. `NavDashboard/backend/modules/reports/schemas.py`
20. `NavDashboard/backend/modules/reports/repository.py`
21. `NavDashboard/backend/modules/reports/service.py`
22. `NavDashboard/backend/modules/reports/router.py`
23. `NavDashboard/backend/modules/reports/generators.py`
24. `NavDashboard/backend/modules/reports/templates_pdf.py`

### Backend — Modified Files (2 files)
25. `NavDashboard/backend/main.py`
26. `NavDashboard/backend/migrations/env.py`

### Frontend — Documents Module (5 files)
27. `NavDashboard/frontend/src/modules/documents/pages/DocumentsPage.tsx`
28. `NavDashboard/frontend/src/modules/documents/components/DocumentUploader.tsx`
29. `NavDashboard/frontend/src/modules/documents/components/DocumentList.tsx`
30. `NavDashboard/frontend/src/modules/documents/hooks/useDocuments.ts`

### Frontend — Backup Module (4 files)
31. `NavDashboard/frontend/src/modules/backup/pages/BackupPage.tsx`
32. `NavDashboard/frontend/src/modules/backup/components/ExportOptions.tsx`
33. `NavDashboard/frontend/src/modules/backup/components/ImportUploader.tsx`
34. `NavDashboard/frontend/src/modules/backup/hooks/useBackup.ts`

### Frontend — Reports Module (4 files)
35. `NavDashboard/frontend/src/modules/reports/pages/ReportsPage.tsx`
36. `NavDashboard/frontend/src/modules/reports/components/ReportBuilder.tsx`
37. `NavDashboard/frontend/src/modules/reports/hooks/useReports.ts`

### Frontend — Modified File (1 file)
38. `NavDashboard/frontend/src/app/routes.tsx`

### Docker — Modified File (1 file)
39. `NavDashboard/docker-compose.yml`

**Total: 39 files**

---

## DOCKER-COMPOSE CHANGES

The existing `docker-compose.yml` already has a `minio` service defined.
Generate the FULL `docker-compose.yml` with:
- All existing services: nginx, frontend, backend, db, redis, celery-worker (if present), mosquitto (if present)
- MinIO service **uncommented and active**:
  ```yaml
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-navdashboard}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-navdashboard_minio_secret}
    volumes:
      - minio_data:/data
    networks:
      - navdashboard_net
    restart: always
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3
  ```
- Backend `depends_on` should include `minio`
- Add `minio_data` to volumes section if not already there
- Keep all other services EXACTLY as they are currently
- Preserve the commented-out ollama service block

**IMPORTANT:** The current docker-compose.yml structure must be preserved. Only add/uncomment minio and update backend depends_on. If you don't know the exact current content, generate a complete docker-compose.yml with:
- nginx (build: ./nginx, ports: 80:80, depends_on: frontend, backend)
- frontend (build: ./frontend, depends_on: backend)
- backend (build: ./backend, ports: internal 8000, depends_on: db, redis, minio, volumes: ./backend:/app)
- db (image: imresamu/postgis:16-3.5, ports: 5432:5432, volumes: postgres_data + ./database/init + ./database/backups)
- redis (image: redis:7-alpine, volumes: redis_data)
- minio (as above)
- Commented-out ollama block
- Networks: navdashboard_net
- Volumes: postgres_data, redis_data, minio_data, ollama_data

---

## DETAILED SPECIFICATIONS

---

### DOCUMENTS MODULE — Backend

**`models.py`:**
```python
from core.database import Base, SoftDeleteMixin
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PgUUID
import uuid

class Document(Base, SoftDeleteMixin):
    __tablename__ = "documents"

    id = Column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)       # pdf, image, doc, xlsx, etc.
    mime_type = Column(String, nullable=True)
    file_size = Column(Integer, nullable=False)       # bytes
    storage_path = Column(String, nullable=False)     # MinIO object key
    entity_type = Column(String, nullable=True)       # device, couple, pair, error, general
    entity_id = Column(PgUUID(as_uuid=True), nullable=True)
    uploaded_by = Column(PgUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
```
NOTE: This model inherits `Base` which provides `id`, `created_at`, `updated_at`, `deleted_at`. Since we're also defining `id` explicitly with PgUUID, check how your existing models handle this. If `Base` already provides `id` as a `Mapped[UUID]`, then do NOT redefine `id` — just let Base handle it. Follow the SAME pattern as existing models like `Device`, `Couple`, `Pair`. Look at how those models define their columns (they use `Base` which provides id automatically). Generate the Document model consistently with existing patterns.

**`schemas.py`:**
```python
class DocumentCreate(BaseModel):
    entity_type: str | None = None
    entity_id: UUID | None = None
    description: str | None = None

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_type: str
    mime_type: str | None
    file_size: int
    storage_path: str
    entity_type: str | None
    entity_id: UUID | None
    uploaded_by: UUID
    description: str | None
    created_at: datetime
    download_url: str | None = None  # presigned URL from MinIO

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    size: int
    pages: int
```

**`storage.py`** — MinIO client wrapper:
```python
from minio import Minio
from minio.error import S3Error
from core.config import settings
import io
import uuid

class MinIOStorage:
    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,       # "minio:9000"
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=False                              # internal Docker network
        )
        self.bucket = settings.MINIO_BUCKET          # "navdashboard-files"

    async def ensure_bucket(self):
        """Create bucket if it doesn't exist."""
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    async def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> str:
        """Upload file bytes to MinIO. Returns the object name (storage path)."""
        self.client.put_object(
            self.bucket,
            object_name,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type,
        )
        return object_name

    async def download_file(self, object_name: str) -> bytes:
        """Download file from MinIO. Returns bytes."""
        response = self.client.get_object(self.bucket, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        return data

    async def delete_file(self, object_name: str):
        """Delete file from MinIO."""
        self.client.remove_object(self.bucket, object_name)

    async def get_presigned_url(self, object_name: str, expires_hours: int = 1) -> str:
        """Generate presigned download URL."""
        from datetime import timedelta
        return self.client.presigned_get_object(
            self.bucket, object_name, expires=timedelta(hours=expires_hours)
        )

def get_storage() -> MinIOStorage:
    """Dependency for FastAPI."""
    return MinIOStorage()
```

NOTE: The minio Python library is synchronous. The `async` keyword on methods is for consistency with the async service layer — the actual minio calls are sync but fast (they're just HTTP calls to the local MinIO container). This is acceptable. Do NOT try to make them truly async with `run_in_executor` — it adds complexity for no real benefit at this scale.

**`repository.py`:**
- Standard CRUD: `get_by_id`, `get_multi` (with filters for entity_type, entity_id, file_type), `create`, `soft_delete`
- `get_by_entity(db, entity_type, entity_id, skip, limit)` — documents for a specific entity
- Count query for pagination

**`service.py`:**
- `upload_document(db, file: UploadFile, metadata: DocumentCreate, user_id: UUID, storage: MinIOStorage) -> DocumentResponse`
  1. Read file bytes
  2. Generate unique storage path: `{entity_type}/{entity_id}/{uuid}_{original_filename}` (or `general/{uuid}_{filename}` if no entity)
  3. Detect file_type from extension
  4. Call `storage.ensure_bucket()` then `storage.upload_file()`
  5. Create Document record in DB
  6. Record audit
  7. Return DocumentResponse with presigned download_url
- `get_document(db, id, storage)` — get metadata + generate download URL
- `download_document(db, id, storage)` — get file bytes for streaming response
- `delete_document(db, id, storage)` — soft delete in DB (optionally delete from MinIO too)
- `list_documents(db, page, size, entity_type, entity_id, file_type)`
- `list_by_entity(db, entity_type, entity_id, page, size)`

**`router.py` (prefix: `/documents`):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Multipart upload. Form fields: `file` (UploadFile), `entity_type` (optional), `entity_id` (optional), `description` (optional) |
| GET | `/` | List documents. Query: `page`, `size`, `entity_type`, `entity_id`, `file_type` |
| GET | `/{id}` | Get document metadata with download URL |
| GET | `/{id}/download` | Download file as StreamingResponse |
| DELETE | `/{id}` | Soft delete document |
| GET | `/by-entity/{entity_type}/{entity_id}` | Documents for a specific entity |

All require `Depends(get_current_user)`.

For the upload endpoint:
```python
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    entity_type: str | None = Form(None),
    entity_id: str | None = Form(None),
    description: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
```

For the download endpoint:
```python
from fastapi.responses import StreamingResponse
import io

@router.get("/{id}/download")
async def download_document(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    doc, file_bytes = await service.download_document(db, id, storage)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={doc.original_filename}"}
    )
```

---

### BACKUP MODULE — Backend

**`models.py`:**
```python
# No dedicated models for backup module
```

**`schemas.py`:**
```python
class BackupInfo(BaseModel):
    filename: str
    size: int          # bytes
    created_at: datetime
    backup_type: str   # "pg_dump" or "xlsx" or "csv"

class ExportRequest(BaseModel):
    format: str = "xlsx"    # "xlsx" or "csv"
    tables: list[str] | None = None  # None = all tables

class ImportSummary(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: int
    error_details: list[str] | None = None
```

**`pg_dump_handler.py`:**
```python
import subprocess
import os
from datetime import datetime
from core.config import settings

BACKUP_DIR = "/backups"  # Mapped from docker-compose volume ./database/backups:/backups

async def create_pg_dump() -> str:
    """Run pg_dump and save to backup directory. Returns filename."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"navdashboard_backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    # pg_dump connects to the db service via internal Docker network
    cmd = [
        "pg_dump",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-f", filepath,
        "--no-owner",
        "--no-acl",
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")

    return filename

async def restore_pg_dump(filename: str) -> str:
    """Restore from a pg_dump file. Returns status message."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Backup file not found: {filename}")

    cmd = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-f", filepath,
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"pg_restore failed: {result.stderr}")

    return f"Restored from {filename}"

async def list_backups() -> list[dict]:
    """List all backup files in the backup directory."""
    backups = []
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        return backups

    for f in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if f.endswith((".sql", ".dump")):
            filepath = os.path.join(BACKUP_DIR, f)
            stat = os.stat(filepath)
            backups.append({
                "filename": f,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "backup_type": "pg_dump",
            })
    return backups

async def delete_backup(filename: str):
    """Delete a backup file."""
    filepath = os.path.join(BACKUP_DIR, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
```

NOTE: The backend container needs `pg_dump` and `psql` available. The backend Dockerfile already installs `libpq-dev`. Add `postgresql-client` to the Dockerfile's apt-get install line if not already present. However, do NOT modify the Dockerfile in this phase — just note it. If `pg_dump` is not available at runtime, the endpoint should return a clear error message saying "pg_dump not available in container".

**`exporter.py`:**
```python
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
import csv
import io
import zipfile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import datetime

# Import all models
from modules.devices.models import Device, DeviceStatusHistory
from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.locations.models import Location, LocationHistory
from modules.personnel.models import Person
from modules.inventory.models import FittingMaterial, MaterialTemplate
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
from modules.status.models import StatusChangeLog
from modules.auth.models import User
```

Functions to implement:
- `async def export_xlsx(db: AsyncSession, tables: list[str] | None = None) -> bytes`
  - Creates an openpyxl Workbook
  - For each table/model: query all non-deleted records, create a sheet
  - Sheets to include (in this order, skip if not in `tables` list or `tables` is None for all):
    - "Devices": all Device columns
    - "Couples": all Couple columns
    - "Pairs": all Pair columns
    - "Locations": all Location columns (latitude, longitude, address_note)
    - "LocationHistory": all LocationHistory columns
    - "Personnel": all Person columns
    - "FittingMaterials": all FittingMaterial columns
    - "MaterialTemplates": all MaterialTemplate columns
    - "ErrorLogs": all ErrorLog columns
    - "TroubleshootEntries": all TroubleshootEntry columns
    - "StatusChangeLogs": all StatusChangeLog columns
    - "Users": id, email, username, full_name, role, is_active (EXCLUDE hashed_password)
  - Header row: bold white font on dark background (`#151515`)
  - Auto-width columns
  - Convert UUIDs to strings, datetimes to ISO format, JSONB to JSON strings
  - Return workbook as bytes via `io.BytesIO`

- `async def export_csv(db: AsyncSession, tables: list[str] | None = None) -> bytes`
  - Creates a ZIP file containing one CSV per table
  - Same tables as XLSX
  - Each CSV has header row + data rows
  - Return ZIP as bytes via `io.BytesIO`

Helper:
- `def model_to_row(instance, columns: list[str]) -> list` — converts a SQLAlchemy model instance to a list of string values for the given column names. Handle UUID, datetime, dict (JSONB) serialization.
- `def get_export_tables() -> list[dict]` — returns list of `{"name": "Devices", "key": "devices", "model": Device, "columns": [...]}` for all exportable tables

**`importer.py`:**
```python
import openpyxl
import csv
import io
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
```

Functions:
- `async def import_xlsx(db: AsyncSession, file_bytes: bytes, user_id: UUID) -> dict`
  - Parse XLSX workbook
  - For each sheet: match sheet name to a model/table
  - For each row: attempt upsert (Business Rule #10):
    1. If `id` column exists and has a value → try to find by id → update if found
    2. Else if `serial_number` exists → try to find by serial_number → update if found
    3. Else if `name` exists → try to find by name → update if found
    4. Else → create new record
  - Track: created count, updated count, error count, error details
  - Record audit for each created/updated record
  - Return ImportSummary dict

- `async def import_csv(db: AsyncSession, zip_bytes: bytes, user_id: UUID) -> dict`
  - Extract ZIP, parse each CSV file
  - Same upsert logic as XLSX
  - Return ImportSummary dict

Helper:
- `def parse_value(value: str, column_type: str) -> any` — convert string values back to proper types (UUID, datetime, bool, int, float, JSON)
- `def match_sheet_to_model(sheet_name: str) -> tuple[Model, list[str]]` — map sheet name to SQLAlchemy model and column list

**`repository.py`:**
```python
# No dedicated models — backup reads/writes across all tables
# Helper functions for backup-specific queries if needed

async def get_table_counts(db: AsyncSession) -> dict[str, int]:
    """Get row counts for all tables (for backup summary)."""
    tables = ["devices", "couples", "pairs", "locations", "personnel",
              "fitting_materials", "error_logs", "users"]
    counts = {}
    for table in tables:
        result = await db.execute(text(f"SELECT COUNT(*) FROM {table} WHERE deleted_at IS NULL"))
        counts[table] = result.scalar() or 0
    return counts
```

**`service.py`:**
- Wraps pg_dump_handler, exporter, importer calls
- Records audit for backup/restore/export/import operations
- `create_backup(db, user_id)` → calls `pg_dump_handler.create_pg_dump()`
- `restore_backup(db, filename, user_id)` → calls `pg_dump_handler.restore_pg_dump()`
- `get_backup_history()` → calls `pg_dump_handler.list_backups()`
- `export_data(db, format, tables)` → calls exporter
- `import_data(db, file_bytes, format, user_id)` → calls importer
- `get_table_counts(db)` → for showing what will be exported

**`router.py` (prefix: `/backup`):**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/pg-dump` | Trigger pg_dump backup. Returns BackupInfo. |
| GET | `/pg-dump/history` | List past pg_dump backups. Returns list[BackupInfo]. |
| GET | `/pg-dump/download/{filename}` | Download a backup file as StreamingResponse. |
| POST | `/pg-dump/restore` | Upload a .sql file and restore. Accepts UploadFile. |
| DELETE | `/pg-dump/{filename}` | Delete a backup file. |
| POST | `/export/xlsx` | Export data as XLSX. Body: ExportRequest. Returns StreamingResponse (file download). |
| POST | `/export/csv` | Export data as CSV ZIP. Body: ExportRequest. Returns StreamingResponse. |
| POST | `/import/xlsx` | Upload XLSX, import data. Returns ImportSummary. |
| POST | `/import/csv` | Upload CSV ZIP, import data. Returns ImportSummary. |
| GET | `/table-counts` | Get row counts for all tables. Returns dict. |

All require `Depends(get_current_user)`. pg-dump and restore require `require_role("ADMIN")`.

For file downloads:
```python
@router.post("/export/xlsx")
async def export_xlsx(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await service.export_data(db, "xlsx", request.tables)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=navdashboard_export_{timestamp}.xlsx"}
    )
```

---

### REPORTS MODULE — Backend

**`models.py`:**
```python
# No dedicated models — reports generate from other module data
```

**`schemas.py`:**
```python
class ReportTemplate(BaseModel):
    id: str
    name: str
    description: str
    parameters: list[str]  # configurable parameter names

class ReportRequest(BaseModel):
    template_id: str       # "device_inventory", "error_summary", "location_history", "pair_status", "full_system"
    format: str = "pdf"    # "pdf" or "xlsx"
    date_from: datetime | None = None
    date_to: datetime | None = None
    entity_ids: list[UUID] | None = None   # filter to specific entities
    include_charts: bool = True

class ReportResponse(BaseModel):
    filename: str
    format: str
    size: int
    generated_at: datetime
```

**`templates_pdf.py`:**
PDF layout helpers using ReportLab:
```python
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.graphics.shapes import Drawing, Line
from datetime import datetime
import io
```

Functions:
- `def create_pdf_template(title: str, subtitle: str = "") -> tuple[SimpleDocTemplate, list]`
  - Creates A4 document with dark-themed header/footer
  - Header: "NavDashboard" branding + report title + generation date
  - Footer: page number
  - Returns (doc, elements_list)

- `def add_table_to_pdf(elements: list, headers: list[str], rows: list[list], title: str = "")`
  - Creates a ReportLab Table with styled header (dark background, white text) and alternating row colors
  - Auto-sizes columns

- `def add_summary_section(elements: list, stats: dict)`
  - Renders key-value stats as a formatted section

- `def finalize_pdf(doc: SimpleDocTemplate, elements: list) -> bytes`
  - Builds the PDF and returns bytes

**`generators.py`:**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from modules.reports.templates_pdf import *
import xlsxwriter
import io
from datetime import datetime
```

Functions:
- `async def generate_device_inventory_pdf(db, date_from, date_to, entity_ids) -> bytes`
  - Query all devices (filtered)
  - Table: Serial Number, Type, Status, Couple, Person, Notes
  - Summary: total count, by type, by status

- `async def generate_device_inventory_xlsx(db, date_from, date_to, entity_ids) -> bytes`
  - Same data as PDF but in Excel format using xlsxwriter
  - Sheet "Summary" + sheet "Devices"

- `async def generate_error_summary_pdf(db, date_from, date_to, entity_ids) -> bytes`
  - Query error_logs (filtered by date range)
  - Table: Date, Entity, Error Type, Severity, Status (open/resolved), Description
  - Summary: total errors, by severity, resolution rate

- `async def generate_error_summary_xlsx(db, ...) -> bytes`

- `async def generate_location_history_pdf(db, date_from, date_to, entity_ids) -> bytes`
  - Query location_history (filtered)
  - Table: Date, Couple, From (lat/lng), To (lat/lng), Distance, Handler, Had RF

- `async def generate_location_history_xlsx(db, ...) -> bytes`

- `async def generate_pair_status_pdf(db, ...) -> bytes`
  - Query all pairs with couples
  - Table: Pair Name, Status, Couple A, Couple B, Devices, Notes

- `async def generate_pair_status_xlsx(db, ...) -> bytes`

- `async def generate_full_system_pdf(db, ...) -> bytes`
  - Combines all above into one comprehensive report with page breaks between sections

- `async def generate_full_system_xlsx(db, ...) -> bytes`

**`repository.py`:**
- Query functions used by generators:
  - `get_devices_for_report(db, date_from, date_to, entity_ids)` — devices with joins for couple name, person name
  - `get_errors_for_report(db, date_from, date_to, entity_ids)` — errors with joins
  - `get_location_history_for_report(db, date_from, date_to, entity_ids)` — location history with joins
  - `get_pairs_for_report(db, entity_ids)` — pairs with nested couples

**`service.py`:**
```python
REPORT_TEMPLATES = [
    {"id": "device_inventory", "name": "Device Inventory", "description": "Complete inventory of all LiFi devices", "parameters": ["date_from", "date_to"]},
    {"id": "error_summary", "name": "Error Summary", "description": "Summary of all errors and troubleshooting", "parameters": ["date_from", "date_to"]},
    {"id": "location_history", "name": "Location History", "description": "Movement history of all couples", "parameters": ["date_from", "date_to"]},
    {"id": "pair_status", "name": "Pair Status Report", "description": "Current status of all pairs and their couples", "parameters": []},
    {"id": "full_system", "name": "Full System Report", "description": "Comprehensive report of the entire system", "parameters": ["date_from", "date_to"]},
]
```

- `get_templates() -> list[ReportTemplate]`
- `async def generate_report(db, request: ReportRequest) -> tuple[bytes, str, str]`
  - Returns (file_bytes, filename, content_type)
  - Dispatches to correct generator based on template_id + format
  - Records audit

**`router.py` (prefix: `/reports`):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates` | List available report templates. Returns list[ReportTemplate]. |
| POST | `/generate` | Generate report. Body: ReportRequest. Returns StreamingResponse (file download). |

All require `Depends(get_current_user)`.

---

### DOCUMENTS MODULE — Frontend

**`useDocuments.ts`:**
```typescript
interface DocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  mime_type: string | null;
  file_size: number;
  storage_path: string;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string;
  description: string | null;
  created_at: string;
  download_url: string | null;
}

// useDocuments(filters?) → list documents
//   GET /api/v1/documents/?page=&size=&entity_type=&file_type=
//   Returns PaginatedResponse<DocumentItem>

// useDocumentsByEntity(entityType, entityId) → docs for entity
//   GET /api/v1/documents/by-entity/{entityType}/{entityId}

// useUploadDocument() → mutation
//   POST /api/v1/documents/upload (multipart FormData)
//   On success: invalidate ['documents'] queries

// useDeleteDocument() → mutation
//   DELETE /api/v1/documents/{id}
//   On success: invalidate ['documents'] queries
```

For the upload mutation, use FormData:
```typescript
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; entityType?: string; entityId?: string; description?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.entityType) formData.append('entity_type', data.entityType);
      if (data.entityId) formData.append('entity_id', data.entityId);
      if (data.description) formData.append('description', data.description);

      // Use axios directly for FormData (not api.post which sets JSON content-type)
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
```

**`DocumentsPage.tsx`:**
- PageHeader: "Documents" with "Upload" button (GlassButton primary)
- Filter bar: entity type select (All, Device, Couple, Pair, Error, General), file type select (All, PDF, Image, Document, Spreadsheet)
- DocumentList component below
- Upload modal (GlassModal) with DocumentUploader component
- Pagination controls

**`DocumentUploader.tsx`:**
- Props: `onClose: () => void`, `defaultEntityType?: string`, `defaultEntityId?: string`
- Ant Design `Upload.Dragger` component styled with glass aesthetic:
  - Background: `rgba(255,255,255,0.02)`
  - Border: dashed `#242424`
  - Hover: border `#7A7A7A`
- Fields:
  - File drop zone (single file at a time)
  - Entity Type: Select (optional) — Device, Couple, Pair, Error, General
  - Entity: Searchable Select (optional, loads from relevant API when entity type selected)
  - Description: GlassInput textarea
- Upload progress bar (Ant Design Progress component)
- "Upload" button (GlassButton, disabled until file selected)
- Success/error feedback via `message.success` / `message.error`

**`DocumentList.tsx`:**
- Props: `documents: DocumentItem[]`, `loading: boolean`, `onDelete: (id: string) => void`
- Grid of GlassCards (responsive: 1-3 columns)
- Each card:
  - File icon based on type: 📄 PDF, 🖼️ Image, 📊 Spreadsheet, 📝 Document, 📎 Other
  - Filename (bold, truncated)
  - File size (formatted: KB, MB)
  - Entity type tag (if linked to entity)
  - Upload date (relative, using dayjs)
  - Description snippet (truncated)
  - Actions: Download button (opens download URL in new tab), Delete button (with ConfirmDialog)
- Alternatively, a table view toggle showing: Filename, Type, Size, Entity, Date, Actions

---

### BACKUP MODULE — Frontend

**`useBackup.ts`:**
```typescript
interface BackupInfo {
  filename: string;
  size: number;
  created_at: string;
  backup_type: string;
}

interface ImportSummary {
  total_rows: number;
  created: number;
  updated: number;
  errors: number;
  error_details: string[] | null;
}

interface TableCounts {
  [table: string]: number;
}

// useBackupHistory() → GET /api/v1/backup/pg-dump/history → list[BackupInfo]
// useCreateBackup() → mutation POST /api/v1/backup/pg-dump → BackupInfo
// useDeleteBackup() → mutation DELETE /api/v1/backup/pg-dump/{filename}
// useExportXlsx() → mutation POST /api/v1/backup/export/xlsx → triggers download
// useExportCsv() → mutation POST /api/v1/backup/export/csv → triggers download
// useImportXlsx() → mutation POST /api/v1/backup/import/xlsx (FormData) → ImportSummary
// useImportCsv() → mutation POST /api/v1/backup/import/csv (FormData) → ImportSummary
// useTableCounts() → GET /api/v1/backup/table-counts → TableCounts
```

For export mutations, handle the file download:
```typescript
export function useExportXlsx() {
  return useMutation({
    mutationFn: async (tables?: string[]) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/backup/export/xlsx', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format: 'xlsx', tables }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navdashboard_export_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
```

**`BackupPage.tsx`:**
- PageHeader: "Backup & Restore"
- Two-section layout:

**Section 1: "Database Backup" (GlassCard)**
- "Create Backup" button (GlassButton primary) — triggers pg_dump
- Loading state while backup runs
- Success message with backup filename
- Backup history table:
  - Columns: Filename, Size (formatted), Date, Actions (Download, Delete)
  - Download: `<a href="/api/v1/backup/pg-dump/download/{filename}">` with auth header
  - Delete: ConfirmDialog before deletion
- "Restore from Backup" section:
  - Upload area for .sql file (Ant Design Upload)
  - Warning message: "⚠️ This will overwrite existing data. Make sure you have a current backup."
  - ConfirmDialog before restore

**Section 2: "Data Export & Import" (GlassCard)**
- Left half: ExportOptions component
- Right half: ImportUploader component

**`ExportOptions.tsx`:**
- Props: none (self-contained)
- Table count summary at top (from `useTableCounts()`): shows each table with row count
- Checkbox list of tables to export (all checked by default):
  - "Select All" / "Deselect All" toggle
  - Individual checkboxes: Devices, Couples, Pairs, Locations, Personnel, Materials, Errors, Users, etc.
- Format selector: Radio group — XLSX / CSV
- "Export" button (GlassButton primary)
- Loading state during export
- Download triggers automatically on completion

**`ImportUploader.tsx`:**
- Props: none (self-contained)
- File upload area (Ant Design Upload.Dragger, glass styled)
- Accepts: .xlsx, .csv, .zip files
- After file selected: show file info (name, size)
- "Import" button (GlassButton primary)
- Warning: "Records will be matched by ID or serial_number/name. Existing records will be updated."
- ConfirmDialog before import
- After import: show ImportSummary card — created count, updated count, error count
- If errors: expandable list of error details
- Success/error feedback via Ant Design `message`

---

### REPORTS MODULE — Frontend

**`useReports.ts`:**
```typescript
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: string[];
}

interface ReportRequest {
  template_id: string;
  format: string;
  date_from?: string;
  date_to?: string;
  entity_ids?: string[];
  include_charts?: boolean;
}

// useReportTemplates() → GET /api/v1/reports/templates → list[ReportTemplate]
// useGenerateReport() → mutation POST /api/v1/reports/generate → triggers file download
```

For the generate mutation, handle file download similar to backup export:
```typescript
export function useGenerateReport() {
  return useMutation({
    mutationFn: async (request: ReportRequest) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error('Report generation failed');
      const blob = await response.blob();
      const ext = request.format === 'pdf' ? 'pdf' : 'xlsx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `navdashboard_${request.template_id}_${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });
}
```

**`ReportsPage.tsx`:**
- PageHeader: "Reports"
- Template gallery: grid of GlassCards, one per report template
  - Each card: report name (bold), description, available parameters listed
  - "Generate" button on each card → opens ReportBuilder in a GlassModal
- Below gallery: ReportBuilder component (also accessible via card click)

**`ReportBuilder.tsx`:**
- Props: `template?: ReportTemplate`, `onClose?: () => void`
- If used inside modal: shows selected template info at top
- If used standalone: template selector dropdown
- Parameters section (conditional based on template.parameters):
  - Date range picker (if template has "date_from"/"date_to" params)
  - Entity selector (if applicable)
- Format selector: Radio group — PDF / Excel
- "Generate Report" button (GlassButton primary)
- Loading state with progress message: "Generating report..."
- On success: file downloads automatically + success message
- On error: error message display

---

### MODIFIED FILES

**`main.py`** — Full replacement. Keep ALL existing 13 router includes and add 3 new ones:
```python
from modules.documents.router import router as documents_router
from modules.backup.router import router as backup_router
from modules.reports.router import router as reports_router

# Add after existing includes:
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(backup_router, prefix="/api/v1/backup", tags=["Backup"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
```

Keep everything else identical: CORS, exception handlers, health endpoint, startup event, all 13 existing router includes.

**`migrations/env.py`** — Full replacement. Keep ALL existing model imports and add:
```python
from modules.documents.models import Document
```
This is the only new model. Backup

```markdown
and Reports have no new models.

**`routes.tsx`** — Full replacement. Keep ALL existing routes. Replace PlaceholderPage for `/documents`, `/backup`, `/reports` with new page components:
```typescript
import DocumentsPage from '@/modules/documents/pages/DocumentsPage';
import BackupPage from '@/modules/backup/pages/BackupPage';
import ReportsPage from '@/modules/reports/pages/ReportsPage';
```
Keep all other routes exactly as they are (dashboard, devices, device detail, couples, couple detail, pairs, pair detail, map, troubleshooting, search, audit, comparison, login, and remaining placeholders for `/ai`, `/location-history`, `/settings`).

**`docker-compose.yml`** — Full replacement with MinIO service active. See DOCKER-COMPOSE CHANGES section above for exact specification.

---

## BACKEND DOCKERFILE NOTE

The backend Dockerfile currently installs `gcc`, `libpq-dev`, `gdal-bin`, `libgdal-dev`. For pg_dump/pg_restore to work from the backend container, `postgresql-client` must also be installed. Add it to the `apt-get install` line.

Generate a complete replacement:

**`NavDashboard/backend/Dockerfile`** (add to file list as file #40):

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

Also update the requirements.txt to ensure `minio` and `reportlab` and `xlsxwriter` are present.

**`NavDashboard/backend/requirements.txt`** (add to file list as file #41):

```
fastapi>=0.110
uvicorn[standard]>=0.29
sqlalchemy>=2.0
alembic>=1.13
asyncpg
psycopg2-binary
geoalchemy2>=0.15
pydantic>=2.6
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
bcrypt==4.0.1
python-multipart
redis>=5.0
httpx
openpyxl
python-dotenv
minio
reportlab
xlsxwriter
pandas
aiofiles
pytest
pytest-asyncio
```

NOTE: Keep the exact same packages that already exist in your current requirements.txt. The above list is the minimum. If your current file has additional packages (like `langchain`, `celery`, `paho-mqtt`, `pgvector`), keep them. The key additions for this phase are: `minio`, `reportlab`, `xlsxwriter`. If they are already present, no change needed.

---

## UPDATED FILE LIST (41 total)

### Backend — Documents Module (7 files)
1. `NavDashboard/backend/modules/documents/__init__.py`
2. `NavDashboard/backend/modules/documents/models.py`
3. `NavDashboard/backend/modules/documents/schemas.py`
4. `NavDashboard/backend/modules/documents/repository.py`
5. `NavDashboard/backend/modules/documents/service.py`
6. `NavDashboard/backend/modules/documents/router.py`
7. `NavDashboard/backend/modules/documents/storage.py`

### Backend — Backup Module (9 files)
8. `NavDashboard/backend/modules/backup/__init__.py`
9. `NavDashboard/backend/modules/backup/models.py`
10. `NavDashboard/backend/modules/backup/schemas.py`
11. `NavDashboard/backend/modules/backup/repository.py`
12. `NavDashboard/backend/modules/backup/service.py`
13. `NavDashboard/backend/modules/backup/router.py`
14. `NavDashboard/backend/modules/backup/exporter.py`
15. `NavDashboard/backend/modules/backup/importer.py`
16. `NavDashboard/backend/modules/backup/pg_dump_handler.py`

### Backend — Reports Module (8 files)
17. `NavDashboard/backend/modules/reports/__init__.py`
18. `NavDashboard/backend/modules/reports/models.py`
19. `NavDashboard/backend/modules/reports/schemas.py`
20. `NavDashboard/backend/modules/reports/repository.py`
21. `NavDashboard/backend/modules/reports/service.py`
22. `NavDashboard/backend/modules/reports/router.py`
23. `NavDashboard/backend/modules/reports/generators.py`
24. `NavDashboard/backend/modules/reports/templates_pdf.py`

### Backend — Modified/Replaced Files (4 files)
25. `NavDashboard/backend/main.py`
26. `NavDashboard/backend/migrations/env.py`
27. `NavDashboard/backend/Dockerfile`
28. `NavDashboard/backend/requirements.txt`

### Frontend — Documents Module (4 files)
29. `NavDashboard/frontend/src/modules/documents/pages/DocumentsPage.tsx`
30. `NavDashboard/frontend/src/modules/documents/components/DocumentUploader.tsx`
31. `NavDashboard/frontend/src/modules/documents/components/DocumentList.tsx`
32. `NavDashboard/frontend/src/modules/documents/hooks/useDocuments.ts`

### Frontend — Backup Module (4 files)
33. `NavDashboard/frontend/src/modules/backup/pages/BackupPage.tsx`
34. `NavDashboard/frontend/src/modules/backup/components/ExportOptions.tsx`
35. `NavDashboard/frontend/src/modules/backup/components/ImportUploader.tsx`
36. `NavDashboard/frontend/src/modules/backup/hooks/useBackup.ts`

### Frontend — Reports Module (3 files)
37. `NavDashboard/frontend/src/modules/reports/pages/ReportsPage.tsx`
38. `NavDashboard/frontend/src/modules/reports/components/ReportBuilder.tsx`
39. `NavDashboard/frontend/src/modules/reports/hooks/useReports.ts`

### Frontend/Docker — Modified Files (2 files)
40. `NavDashboard/frontend/src/app/routes.tsx`
41. `NavDashboard/docker-compose.yml`

---

## MINIO CONFIGURATION NOTE

The backend needs these environment variables (should already be in `.env`):
```
MINIO_ROOT_USER=navdashboard
MINIO_ROOT_PASSWORD=navdashboard_minio_secret
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=navdashboard-files
```

If `core/config.py` does not already have these fields, they need to be added. However, DO NOT regenerate `core/config.py`. Instead, in `storage.py`, handle missing config gracefully:
```python
class MinIOStorage:
    def __init__(self):
        endpoint = getattr(settings, 'MINIO_ENDPOINT', 'minio:9000')
        access_key = getattr(settings, 'MINIO_ROOT_USER', 'navdashboard')
        secret_key = getattr(settings, 'MINIO_ROOT_PASSWORD', 'navdashboard_minio_secret')
        self.bucket = getattr(settings, 'MINIO_BUCKET', 'navdashboard-files')
        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=False,
        )
```

Also, the `storage.py` `ensure_bucket` should be called on first upload, not on init. Handle MinIO connection errors gracefully — if MinIO is not running, upload should return a clear error rather than crashing the entire backend.

---

## NGINX NOTE

The nginx config may need updating to handle larger file uploads. The existing config should already have `client_max_body_size 100M`. If generating a new nginx config, ensure this is present. However, DO NOT regenerate the nginx config — it's not in the file list.

---

## VERIFICATION STEPS

After generating all files, test in this order:

1. **Rebuild everything** (MinIO is new):
   ```bash
   docker compose down
   docker compose up -d --build
   ```

2. **Check all services running:**
   ```bash
   docker compose ps
   # Should show: nginx, frontend, backend, db, redis, minio — all "Up"
   ```

3. **Check MinIO console:**
   Open `http://localhost:9001` in browser. Login: navdashboard / navdashboard_minio_secret

4. **Run migration** (for documents table):
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "add_documents"
   docker compose exec backend alembic upgrade head
   ```

5. **Get auth token:**
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@navdashboard.com","password":"admin123"}' | jq -r .access_token)
   ```

6. **Test document upload:**
   ```bash
   echo "test file content" > /tmp/test.txt
   curl -s -X POST http://localhost/api/v1/documents/upload \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@/tmp/test.txt" \
     -F "entity_type=general" \
     -F "description=Test upload" | jq .
   ```

7. **Test document list:**
   ```bash
   curl -s http://localhost/api/v1/documents/ \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

8. **Test document download:**
   ```bash
   DOC_ID=$(curl -s http://localhost/api/v1/documents/ \
     -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')
   curl -s http://localhost/api/v1/documents/$DOC_ID/download \
     -H "Authorization: Bearer $TOKEN" -o /tmp/downloaded.txt
   cat /tmp/downloaded.txt
   ```

9. **Test XLSX export:**
   ```bash
   curl -s -X POST http://localhost/api/v1/backup/export/xlsx \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"format":"xlsx"}' -o /tmp/export.xlsx
   ls -la /tmp/export.xlsx
   ```

10. **Test pg_dump:**
    ```bash
    curl -s -X POST http://localhost/api/v1/backup/pg-dump \
      -H "Authorization: Bearer $TOKEN" | jq .
    ```

11. **Test backup history:**
    ```bash
    curl -s http://localhost/api/v1/backup/pg-dump/history \
      -H "Authorization: Bearer $TOKEN" | jq .
    ```

12. **Test table counts:**
    ```bash
    curl -s http://localhost/api/v1/backup/table-counts \
      -H "Authorization: Bearer $TOKEN" | jq .
    ```

13. **Test report templates:**
    ```bash
    curl -s http://localhost/api/v1/reports/templates \
      -H "Authorization: Bearer $TOKEN" | jq .
    ```

14. **Test report generation (PDF):**
    ```bash
    curl -s -X POST http://localhost/api/v1/reports/generate \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"template_id":"device_inventory","format":"pdf"}' \
      -o /tmp/report.pdf
    ls -la /tmp/report.pdf
    ```

15. **Test report generation (Excel):**
    ```bash
    curl -s -X POST http://localhost/api/v1/reports/generate \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"template_id":"error_summary","format":"xlsx"}' \
      -o /tmp/report.xlsx
    ls -la /tmp/report.xlsx
    ```

16. **Test frontend pages:**
    - `/documents` — upload a file, see it in the list, download it, delete it
    - `/backup` — create backup, see history, export XLSX, import XLSX
    - `/reports` — see templates, generate PDF report, generate Excel report

17. **Verify existing features unbroken:**
    - `/devices`, `/couples`, `/pairs`, `/map`, `/troubleshooting`, `/search`, `/audit`, `/comparison` all still work

---

## RULES REMINDER

- ✅ Generate ALL 41 files listed — complete contents, no abbreviation
- ✅ Use exact color hex values from the palette
- ✅ Follow existing patterns (router, repository, service, hooks, pages)
- ✅ Use `from_attributes = True` in Pydantic models (not `orm_mode`)
- ✅ Use default imports for shared components: `import GlassCard from '...'` NOT `{ GlassCard }`
- ✅ main.py must include ALL existing 13 router includes plus 3 new ones
- ✅ migrations/env.py must include ALL existing model imports plus `Document`
- ✅ routes.tsx must include ALL existing routes plus 3 new page components
- ✅ docker-compose.yml must include ALL existing services plus MinIO active
- ✅ Handle MinIO connection errors gracefully — don't crash the backend
- ✅ Handle pg_dump unavailability gracefully — return clear error message
- ❌ DO NOT modify any file not listed above
- ❌ DO NOT abbreviate with "// ... rest of code" or "# similar to above"
- ❌ DO NOT skip any file
- ❌ DO NOT use named imports `{ Component }` for shared components
```

