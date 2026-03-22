

## TECHNICAL REPORT — Phase 11b: Documents + Backup + Reports

---

### 1. Files Created/Modified — 43 total

| Category | Count | Details |
|----------|-------|---------|
| **Backend — Documents Module** | 7 | `__init__.py`, `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`, `storage.py` |
| **Backend — Backup Module** | 9 | `__init__.py`, `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`, `exporter.py`, `importer.py`, `pg_dump_handler.py` |
| **Backend — Reports Module** | 8 | `__init__.py`, `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`, `generators.py`, `templates_pdf.py` |
| **Backend — Modified** | 4 | `main.py`, `migrations/env.py`, `Dockerfile`, `requirements.txt` |
| **Frontend — Documents** | 4 | `DocumentsPage.tsx`, `DocumentUploader.tsx`, `DocumentList.tsx`, `useDocuments.ts` |
| **Frontend — Backup** | 4 | `BackupPage.tsx`, `ExportOptions.tsx`, `ImportUploader.tsx`, `useBackup.ts` |
| **Frontend — Reports** | 3 | `ReportsPage.tsx`, `ReportBuilder.tsx`, `useReports.ts` |
| **Frontend/Docker — Modified** | 2 | `routes.tsx`, `docker-compose.yml` |
| **Infra — Modified (during debug)** | 1 | `nginx/default.conf` (timeout increase) |
| **Post-deploy hotfixes** | 2 | `pg_dump_handler.py` (3 revisions), `service.py` (audit ordering) |

**New database table:** 1 (`documents`)
**New Docker service:** 1 (`minio`)
**Total router count in main.py:** 16 (13 existing + 3 new)

---

### 2. API Surface — New Endpoints

#### Documents Module (`/api/v1/documents`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Multipart file upload to MinIO |
| `GET` | `/` | List documents with filters (entity_type, file_type, pagination) |
| `GET` | `/{id}` | Get document metadata with download URL |
| `GET` | `/{id}/download` | Download file as StreamingResponse |
| `DELETE` | `/{id}` | Soft delete document |
| `GET` | `/by-entity/{entity_type}/{entity_id}` | Documents for a specific entity |

#### Backup Module (`/api/v1/backup`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pg-dump` | Create pg_dump backup (ADMIN only) |
| `GET` | `/pg-dump/history` | List backup files |
| `GET` | `/pg-dump/download/{filename}` | Download backup file (ADMIN only) |
| `POST` | `/pg-dump/restore` | Upload and restore .sql file (ADMIN only) |
| `DELETE` | `/pg-dump/{filename}` | Delete backup file (ADMIN only) |
| `POST` | `/export/xlsx` | Export data as Excel |
| `POST` | `/export/csv` | Export data as CSV ZIP |
| `POST` | `/import/xlsx` | Import from Excel with upsert |
| `POST` | `/import/csv` | Import from CSV ZIP with upsert |
| `GET` | `/table-counts` | Row counts for all tables |

#### Reports Module (`/api/v1/reports`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/templates` | List 5 report templates |
| `POST` | `/generate` | Generate PDF or Excel report |

**Total new endpoints: 18**

---

### 3. Frontend Components — What Renders

#### `/documents` — DocumentsPage
- **PageHeader** with Upload button
- **Filter bar** — Entity Type select, File Type select
- **DocumentList** — Grid/List toggle view with file cards showing icon, name, size, date, entity tag, description
- **DocumentUploader** — Modal with drag-and-drop, entity type/ID fields, description, progress bar
- **Pagination** controls
- Real data confirmed: "Madhur Resume.pdf", "brave_screenshot_github.com.png" visible

#### `/backup` — BackupPage
- **Database Backup section** — Create Backup button, history table (filename, size, date, download/delete), Restore from Backup upload area with warning
- **ExportOptions** — Table count summary (12 tables with row counts), Select All/Deselect All, XLSX/CSV radio, Export button
- **ImportUploader** — Drag-and-drop for XLSX/CSV/ZIP, Import button with confirm dialog, ImportSummary card (created/updated/errors counts)
- Real data confirmed: `navdashboard_backup_20260321_172614.sql` (66.7 KB) visible

#### `/reports` — ReportsPage
- **Template gallery** — 5 GlassCards with icons:
  - Device Inventory (ApiOutlined)
  - Error Summary (BarChartOutlined)
  - Location History (EnvironmentOutlined)
  - Pair Status (FileTextOutlined)
  - Full System (GlobalOutlined)
- **ReportBuilder modal** — Template info, date range picker, PDF/XLSX radio, Generate button

---

### 4. Infrastructure Changes

| Component | Change |
|-----------|--------|
| **MinIO** | New Docker service activated (`minio/minio:latest`, ports 9000/9001) |
| **Backend Dockerfile** | Added `postgresql-client` for pg_dump/psql |
| **requirements.txt** | Added `minio`, `openpyxl`, `reportlab`, `xlsxwriter` |
| **docker-compose.yml** | Added minio service, `minio_data` volume, backend depends_on minio, `./database/backups:/backups` volume mount |
| **nginx/default.conf** | Added `proxy_read_timeout 300s`, `client_max_body_size 100M` |

---

### 5. Issues and Fixes

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Backend failed to start | `ReportRequest` not found in `schemas.py` | File wasn't saved correctly; replaced with complete content |
| 2 | GlassInput crash in DocumentUploader | `GlassInput.onChange` passes raw value, not `e.target.value` | Created `handleInputChange` helper that handles both string and event |
| 3 | Document upload 500 error | Empty string `""` for `entity_id` passed to `UUID()` constructor | Added `_safe_uuid()` helper that returns None for empty/invalid strings |
| 4 | Backup restore 504 Gateway Timeout | nginx default 60s timeout too short | Increased `proxy_read_timeout` to 300s |
| 5 | Restore `transaction_timeout` error | pg_dump v17 outputs `SET transaction_timeout` not supported by PG16 | `_sanitize_sql_file()` strips unsupported SET parameters |
| 6 | Restore `\restrict` metacommand error | pg_dump v17 outputs `\restrict` not recognized by PG16 psql | Added `UNSUPPORTED_METACOMMANDS` filter for `\restrict`, `\allow` |
| 7 | Restore hangs indefinitely (lock contention) | `DROP TABLE CASCADE` needs exclusive locks; SQLAlchemy pool held open connections | `_terminate_other_connections()` kills other DB sessions before restore |
| 8 | Post-restore `ConnectionDoesNotExistError` | `record_audit()` called after restore killed the DB session | Moved audit + explicit `db.commit()` before restore execution |
| 9 | Restore "already exists" errors | Old backups lacked DROP statements | Added `--clean --if-exists` flags to pg_dump |

---

### 6. Phase 12 Needs — What AI Assistant + Location History + Settings Can Use

| Existing Asset | Available For Phase 12 |
|----------------|----------------------|
| **MinIO storage** | AI module can store conversation logs, embeddings, or generated content |
| **Document upload infrastructure** | AI can reference uploaded documents for context |
| **Report generation (PDF/Excel)** | AI can generate reports on demand; Settings can export configuration |
| **Backup/Restore** | Settings page can trigger backup before config changes |
| **Audit trail integration** | All 3 new modules record audit entries; AI interactions should too |
| **`record_audit()` pattern** | Consistent across 16 modules; Phase 12 follows same pattern |
| **Export/Import (XLSX/CSV)** | Location History can export movement data; Settings can import/export configs |
| **`_terminate_other_connections()`** | Useful for any maintenance operations in Settings |
| **16 router includes in main.py** | Phase 12 adds 3 more (ai, location-history, settings) → 19 total |
| **3 remaining PlaceholderPage routes** | `/ai`, `/location-history`, `/settings` ready to be replaced |
| **All 16 database tables** | Location History page queries `location_history` table directly; AI can query any table |