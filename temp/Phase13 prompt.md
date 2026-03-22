

Here's the **Phase 13 prompt** — Location History + Settings + Polish:

```markdown
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — PHASE 13: LOCATION HISTORY + SETTINGS + POLISH
# ═══════════════════════════════════════════════════════════════

## PROJECT STATE (DO NOT REGENERATE — ALREADY EXISTS)

NavDashboard is a LiFi device management system. Phases 1–12 are
complete and working. 17 backend modules, 19 database tables,
6 Docker services.

**Backend modules (17):** auth, devices, couples, pairs, locations,
personnel, inventory, troubleshooting, status, dashboard, search,
audit_trail, comparison, documents, backup, reports, ai_assistant

**Database tables (19):** users, audit_logs, devices, device_status_history,
personnel, assignment_history, fitting_materials, material_templates,
locations, location_history, couples, pairs, error_logs,
troubleshoot_entries, status_change_logs, documents,
chat_sessions, chat_messages, embedding_documents

**Docker services:** nginx (:80), frontend (:3000), backend (:8000),
db (custom postgis+pgvector), redis (:6379), minio (:9000/:9001)

**Current main.py router includes (KEEP ALL 17):**
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
from modules.documents.router import router as documents_router
from modules.backup.router import router as backup_router
from modules.reports.router import router as reports_router
from modules.ai_assistant.router import router as ai_router

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
app.include_router(documents_router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(backup_router, prefix="/api/v1/backup", tags=["Backup"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Assistant"])
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
from modules.documents.models import Document
from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument
```

**Current routes.tsx live routes (KEEP ALL):**
```
/ → DashboardPage
/login → LoginPage
/devices → DeviceListPage
/devices/:id → DeviceDetailPage
/couples → CoupleListPage
/couples/:id → CoupleDetailPage
/pairs → PairListPage
/pairs/:id → PairDetailPage
/map → MapViewPage
/troubleshooting → TroubleshootingPage
/search → SearchPage
/audit → AuditTrailPage
/comparison → ComparisonPage
/documents → DocumentsPage
/backup → BackupPage
/reports → ReportsPage
/ai → AIChatPage
/location-history → PlaceholderPage   ← REPLACE
/settings → PlaceholderPage           ← REPLACE
```

**Shared component imports (use default imports):**
```typescript
import GlassCard from '@/shared/components/GlassCard';
import GlassButton from '@/shared/components/GlassButton';
import GlassInput from '@/shared/components/GlassInput';
import GlassModal from '@/shared/components/GlassModal';
import PageHeader from '@/shared/components/PageHeader';
import DataTable from '@/shared/components/DataTable';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import EmptyState from '@/shared/components/EmptyState';
import StatusBadge from '@/shared/components/StatusBadge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
```

**Existing location history data:**
- The `location_history` table already has entries (created when couple locations change via `PUT /couples/{id}/location`)
- `GET /api/v1/locations/history` already works (returns paginated location history)
- `GET /api/v1/locations/history/{couple_id}` already works
- `GET /api/v1/couples/{id}/location-history` already works
- The map module already has `LocationTrail.tsx` component that renders polylines

**Existing auth endpoints:**
- `GET /api/v1/auth/users` — list all users (admin only)
- `POST /api/v1/auth/register` — create user (admin only)
- `PUT /api/v1/auth/users/{id}` — update user (admin only)
- `DELETE /api/v1/auth/users/{id}` — soft delete user (admin only)
- `GET /api/v1/auth/me` — current user profile

**Existing AI endpoints:**
- `GET /api/v1/ai/health` — Ollama connectivity check
- `GET /api/v1/ai/ingest/status` — embedding sync status

---

## COLOR PALETTE (exact values)

- Background: `#0A0A0A`, Cards: `#141414`, Secondary: `#1A1A1A`
- Text primary: `#F2F2F2`, secondary: `#B8B8B8`, muted: `#7A7A7A`
- Borders: `#242424`, Accent: `#2E2E2E`
- Status: Working `#5F8F6B`, Not Working `#B68A3C`, Faulty `#9B3E3E`
- Role badges: Admin `#8C8C8C`, Technician `#6F7A8C`, Viewer `#6E6E6E`
- Glass: `background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06);`

---

## FILES TO GENERATE (18 total)

### Frontend — Location History Module (4 files)
1. `NavDashboard/frontend/src/modules/location_history/pages/LocationHistoryPage.tsx`
2. `NavDashboard/frontend/src/modules/location_history/components/HistoryTimeline.tsx`
3. `NavDashboard/frontend/src/modules/location_history/components/HistoryMap.tsx`
4. `NavDashboard/frontend/src/modules/location_history/hooks/useLocationHistory.ts`

### Frontend — Settings Module (4 files)
5. `NavDashboard/frontend/src/modules/settings/pages/SettingsPage.tsx`
6. `NavDashboard/frontend/src/modules/settings/components/GeneralSettings.tsx`
7. `NavDashboard/frontend/src/modules/settings/components/UserManagement.tsx`
8. `NavDashboard/frontend/src/modules/settings/hooks/useSettings.ts`

### Backend — Settings Endpoints (6 files)
9. `NavDashboard/backend/modules/settings/__init__.py`
10. `NavDashboard/backend/modules/settings/models.py`
11. `NavDashboard/backend/modules/settings/schemas.py`
12. `NavDashboard/backend/modules/settings/service.py`
13. `NavDashboard/backend/modules/settings/repository.py`
14. `NavDashboard/backend/modules/settings/router.py`

### Seed Script (1 file)
15. `NavDashboard/backend/shared/seed.py`

### Modified Files (3 files)
16. `NavDashboard/backend/main.py`
17. `NavDashboard/backend/migrations/env.py`
18. `NavDashboard/frontend/src/app/routes.tsx`

---

## DETAILED SPECIFICATIONS

---

### LOCATION HISTORY MODULE — Frontend Only

This module has NO new backend code. It uses existing endpoints:
- `GET /api/v1/locations/history?couple_id=&page=&size=&date_from=&date_to=`
- `GET /api/v1/locations/history/{couple_id}`
- `GET /api/v1/couples/?size=100` (for couple dropdown)

It also reuses the existing `LocationTrail` component from `@/modules/map/components/LocationTrail`.

**`useLocationHistory.ts`:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { PaginatedResponse } from '@/shared/types/common';

interface LocationHistoryEntry {
  id: string;
  couple_id: string;
  old_latitude: number;
  old_longitude: number;
  new_latitude: number;
  new_longitude: number;
  moved_at: string;
  handled_by: string | null;
  had_rf: boolean;
  distance_meters: number | null;
  fitting_materials_snapshot: Array<Record<string, any>> | null;
  configuration_snapshot: Record<string, any> | null;
  notes: string | null;
  created_at: string;
  handler_name?: string;
  couple_name?: string;
}

// useLocationHistory(coupleId?, dateRange?) 
//   → GET /api/v1/locations/history with query params
//   → enabled always
//   → if coupleId provided: add ?couple_id= param
//   → if dateRange provided: add ?date_from=&date_to= params

// useAllLocationHistory(filters)
//   → same endpoint with pagination params

// useCoupleTrailData(coupleId)
//   → GET /api/v1/locations/history/{coupleId}?size=100
//   → enabled when coupleId is truthy
//   → transforms data for map rendering: array of {lat, lng, date, distance}
```

**`LocationHistoryPage.tsx`:**
- PageHeader: "Location History"
- Top filter bar:
  - Couple selector: Ant Design Select, searchable, loads from `GET /api/v1/couples/?size=100`
    - Option "All Couples" as first option (value = empty string)
  - Date range: Ant Design RangePicker
  - "Apply" button (GlassButton)
- Two-panel layout (responsive — stack on mobile):
  - **Left panel (50%):** HistoryTimeline — scrollable list of location changes
  - **Right panel (50%):** HistoryMap — Leaflet map showing movement trail
- State management:
  - `selectedCoupleId: string | null` (useState)
  - `selectedEntryId: string | null` (useState) — when clicking a timeline entry, highlight it on map
  - `dateRange: [string, string] | null` (useState)
- When a couple is selected: timeline filters to that couple, map shows its trail
- When "All Couples" is selected: timeline shows all history, map shows all couples' last positions
- Selecting a timeline entry → map flies to that location point

**`HistoryTimeline.tsx`:**
- Props: `entries: LocationHistoryEntry[]`, `loading: boolean`, `selectedId: string | null`, `onSelect: (id: string) => void`
- Vertical timeline with glass connecting line (2px, `#2C2C2C`)
- Each entry is a GlassCard:
  - **Top row:** Couple name tag (if showing all couples) + date/time (relative, absolute on hover)
  - **Middle:** 
    - "From: (lat, lng)" → "To: (lat, lng)" with arrow icon
    - Distance badge: e.g., "152m" in muted pill
  - **Details row:**
    - Handled by: person name
    - Had RF: Yes/No tag
  - **Expandable section** (click "Show details"):
    - Fitting materials snapshot: bullet list of material names + quantities
    - Configuration snapshot: JSON viewer (formatted)
    - Notes (if any)
  - Selected entry: left border accent `#E6E6E6`, slightly brighter background
- Pagination: "Load more" button at bottom OR scroll-based pagination
- If no entries: EmptyState "No location changes recorded"

**`HistoryMap.tsx`:**
- Props: `entries: LocationHistoryEntry[]`, `selectedEntryId: string | null`, `coupleId: string | null`
- Leaflet map using dark CartoDB tiles (same as main map module)
- If `coupleId` is set: show location trail polyline for that couple
  - Reuse `LocationTrail` component from `@/modules/map/components/LocationTrail` if possible
  - If importing is complex, duplicate the polyline logic:
    - Dashed polyline `#7C7C7C` connecting all points chronologically
    - Circle markers at each point with opacity fading (newest = full opacity, oldest = 0.3)
    - Tooltip on each point: date + distance moved
    - Most recent location: larger marker with glow
- If `coupleId` is null (all couples): show all couples' current locations as markers
  - Reuse marker style from map module (colored circles by status)
- When `selectedEntryId` changes: fly to that entry's new location coordinates, highlight the corresponding circle
- FitBounds: initial view fits all visible points
- Map container: glass border, rounded corners

---

### SETTINGS MODULE — Backend

**`models.py`:**
```python
# Settings are stored in a simple key-value table
from core.database import Base
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
import uuid

class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    # Do NOT redefine id if Base already provides it
    # Just add settings-specific columns:
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
```

Follow the same column definition pattern as existing models. If Base provides id/created_at/updated_at/deleted_at, don't redefine them.

**`schemas.py`:**
```python
from pydantic import BaseModel
from datetime import datetime

class SettingResponse(BaseModel):
    key: str
    value: str | None
    description: str | None
    updated_at: datetime | None = None
    
    class Config:
        from_attributes = True

class SettingUpdate(BaseModel):
    value: str

class SystemInfoResponse(BaseModel):
    version: str
    database_size: str
    table_count: int
    total_devices: int
    total_couples: int
    total_pairs: int
    total_documents: int
    total_users: int
    total_audit_entries: int
    total_embeddings: int
    ollama_status: str
    ollama_url: str
    ollama_models: list[str]
    environment: str

class UserCreateRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str
    role: str  # "ADMIN", "TECHNICIAN", "VIEWER"

class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
```

**`repository.py`:**
```python
# get_setting(db, key) → Optional[SystemSetting]
# get_all_settings(db) → list[SystemSetting]
# set_setting(db, key, value, description=None) → SystemSetting (upsert)
# get_system_info(db) → dict  
#   - Database size: SELECT pg_size_pretty(pg_database_size(current_database()))
#   - Table count, entity counts from various tables
```

**`service.py`:**
- Wraps repository calls
- `get_system_info(db)` — aggregates counts, checks Ollama, assembles SystemInfoResponse
- `get_all_settings(db)` — returns all settings
- `update_setting(db, key, value, user_id)` — updates setting, records audit
- Seeds default settings on first call if empty:
  ```python
  DEFAULT_SETTINGS = {
      "ollama_url": ("http://host.docker.internal:11434", "Ollama API URL"),
      "ollama_model": ("llama3", "LLM model for chat"),
      "ollama_embed_model": ("nomic-embed-text", "Embedding model"),
      "default_map_lat": ("48.8566", "Default map center latitude"),
      "default_map_lng": ("2.3522", "Default map center longitude"),
      "default_map_zoom": ("13", "Default map zoom level"),
  }
  ```

**`router.py` (prefix: `/settings`):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Any authenticated | List all settings |
| GET | `/system-info` | Any authenticated | System information summary |
| PUT | `/{key}` | ADMIN only | Update a setting |
| GET | `/users` | ADMIN only | List all users (delegates to auth module) |
| POST | `/users` | ADMIN only | Create user (delegates to auth module) |
| PUT | `/users/{id}` | ADMIN only | Update user (delegates to auth module) |
| DELETE | `/users/{id}` | ADMIN only | Deactivate user (delegates to auth module) |

**NOTE on user management:** The settings module's user endpoints are thin wrappers that call the existing auth module's repository/service functions. Import from `modules.auth.repository` and `modules.auth.service`. Do NOT duplicate user CRUD logic.

```python
from modules.auth import repository as auth_repo
from modules.auth import service as auth_service
from modules.auth.schemas import UserCreate, UserResponse

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    users = await auth_repo.get_multi(db)
    return users
```

---

### SETTINGS MODULE — Frontend

**`useSettings.ts`:**
```typescript
interface SystemSetting {
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null;
}

interface SystemInfo {
  version: string;
  database_size: string;
  table_count: number;
  total_devices: number;
  total_couples: number;
  total_pairs: number;
  total_documents: number;
  total_users: number;
  total_audit_entries: number;
  total_embeddings: number;
  ollama_status: string;
  ollama_url: string;
  ollama_models: string[];
  environment: string;
}

interface UserItem {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

// useSettings() → GET /api/v1/settings/ → list[SystemSetting]
// useSystemInfo() → GET /api/v1/settings/system-info → SystemInfo
// useUpdateSetting() → mutation PUT /api/v1/settings/{key}
//   onSuccess: invalidate ['settings']

// useUsers() → GET /api/v1/settings/users → list[UserItem]
// useCreateUser() → mutation POST /api/v1/settings/users
//   onSuccess: invalidate ['users']
// useUpdateUser() → mutation PUT /api/v1/settings/users/{id}
//   onSuccess: invalidate ['users']
// useDeleteUser() → mutation DELETE /api/v1/settings/users/{id}
//   onSuccess: invalidate ['users']
```

**`SettingsPage.tsx`:**
- PageHeader: "Settings"
- Ant Design Tabs (glass styled):
  - Tab 1: "General" → GeneralSettings component
  - Tab 2: "User Management" → UserManagement component (only visible if user role is ADMIN)
- Tab styling: glass background, active tab indicator `#E6E6E6`

**`GeneralSettings.tsx`:**
- Uses `useSystemInfo()` and `useSettings()`
- Two sections:

**Section 1: System Information (read-only GlassCard)**
- Grid of info items (3 columns):
  - Version: from systemInfo.version
  - Environment: from systemInfo.environment
  - Database Size: from systemInfo.database_size
  - Tables: from systemInfo.table_count
  - Total Devices: from systemInfo.total_devices
  - Total Couples: from systemInfo.total_couples
  - Total Pairs: from systemInfo.total_pairs
  - Total Documents: from systemInfo.total_documents
  - Total Users: from systemInfo.total_users
  - Audit Entries: from systemInfo.total_audit_entries
  - AI Embeddings: from systemInfo.total_embeddings
- Each item: label (muted `#7A7A7A`) + value (primary `#F2F2F2`)

**Section 2: AI Configuration (GlassCard, editable for ADMIN)**
- Ollama Status: green dot + "Connected" / red dot + "Disconnected"
- Ollama URL: editable text input (GlassInput), pre-filled from settings
- Chat Model: editable text input or dropdown of available models (from systemInfo.ollama_models)
- Embedding Model: editable text input
- "Save" button (GlassButton, only shown if values changed)
- If not admin: show values as read-only

**Section 3: Map Defaults (GlassCard, editable for ADMIN)**
- Default Latitude: number input
- Default Longitude: number input  
- Default Zoom: number input (1-18)
- "Save" button

**`UserManagement.tsx`:**
- Only rendered for ADMIN users
- "Create User" button (GlassButton primary) at top right
- User table (DataTable or custom glass table):
  - Columns: Name, Email, Username, Role (badge), Active (toggle), Created, Last Login, Actions
  - Role badges:
    - ADMIN: background `rgba(140,140,140,0.2)`, text `#8C8C8C`
    - TECHNICIAN: background `rgba(111,122,140,0.2)`, text `#6F7A8C`
    - VIEWER: background `rgba(110,110,110,0.2)`, text `#6E6E6E`
  - Active column: Ant Design Switch (styled dark)
  - Actions: Edit button, Deactivate button (or Activate if inactive)
- Create/Edit user modal (GlassModal):
  - Fields: Full Name, Email, Username, Password (create only), Role (Select: ADMIN, TECHNICIAN, VIEWER)
  - Glass-styled inputs
  - Submit button
- Delete/Deactivate: ConfirmDialog

---

### SEED SCRIPT

**`NavDashboard/backend/shared/seed.py`:**

A comprehensive seed script that creates demo data when run via `python -m shared.seed` inside the backend container.

```python
"""
NavDashboard Seed Script
Creates demo data for development and testing.
Safe to run multiple times — checks for existing data.

Usage:
  docker compose exec backend python -m shared.seed
"""
import asyncio
import sys
import os

# Add parent dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

**What to seed (only if tables are empty):**

1. **Users (3):** — SKIP if users table has > 1 row (admin already exists)
   - tech1@navdashboard.com / tech123 / "Sarah Chen" / TECHNICIAN
   - viewer1@navdashboard.com / viewer123 / "James Wilson" / VIEWER

2. **Personnel (6):** — SKIP if personnel table has > 0 rows
   - Ahmed Al-Rashid (Technician)
   - Maria Santos (Installer)
   - James Chen (Manager)
   - Fatima Noor (Technician)
   - Lars Eriksson (Field Engineer)
   - Priya Patel (Senior Technician)

3. **Devices (12):** — SKIP if devices table has > 0 rows
   - IU-001 through IU-003 (Indoor Units, WORKING)
   - OU-001 through OU-003 (Outdoor Units, WORKING/NOT_WORKING/FAULTY)
   - HC-001 through HC-003 (Hybrid Cables, WORKING)
   - RF-001 through RF-003 (RF Listeners, WORKING/NOT_WORKING)

4. **Material Templates (2):** — SKIP if material_templates has > 0 rows
   - "Standard Rooftop Kit": Mounting Bracket ×2, Ethernet Cable Cat6 10m ×1, Weatherproof Sealant ×1, Cable Ties ×20
   - "Indoor Minimal Kit": Wall Mount Plate ×1, Power Adapter ×1, Short Patch Cable ×1

5. **Couples (4) with Locations and Materials:** — SKIP if couples has > 0 rows
   - Couple A1: IU-001 + OU-001 + HC-001, no RF, WORKING, Paris (48.8566, 2.3522), Standard Rooftop materials
   - Couple A2: IU-002 + OU-002 + HC-002 + RF-001, has RF, WORKING, Paris (48.8606, 2.3376), Standard Rooftop materials
   - Couple B1: IU-003 + OU-003 + HC-003, no RF, NOT_WORKING, Paris (48.8530, 2.3499), Indoor Minimal materials
   - Couple B2: spare devices, has RF (RF-002), FAULTY, Paris (48.8490, 2.3410), Standard Rooftop materials

6. **Pairs (2):** — SKIP if pairs has > 0 rows
   - Pair 01: Couple A1 + Couple A2, WORKING
   - Pair 02: Couple B1 + Couple B2, FAULTY (auto-derived from B2)

7. **Error Logs (5) with Troubleshoot Steps:** — SKIP if error_logs has > 0 rows
   - Error 1: Device IU-001, "Connection Loss", HIGH, resolved, 2 steps
   - Error 2: Couple A2, "Signal Degradation", MEDIUM, resolved, 1 step
   - Error 3: Device OU-003, "Hardware Fault", CRITICAL, open
   - Error 4: Couple B1, "Configuration Mismatch", LOW, resolved, 3 steps
   - Error 5: Pair 02, "RF Interference", MEDIUM, open, 1 step

8. **Location History (3 entries):** — SKIP if location_history has > 0 rows
   - Couple A1 moved from (48.8550, 2.3500) to (48.8566, 2.3522), 200m, with materials snapshot
   - Couple B1 moved from (48.8510, 2.3470) to (48.8530, 2.3499), 350m
   - Couple A2 moved from (48.8620, 2.3400) to (48.8606, 2.3376), 250m

9. **Default Settings:** — SKIP if system_settings has > 0 rows
   - All DEFAULT_SETTINGS from the settings service

**Implementation:**
- Use `asyncio.run()` to run async operations
- Create a new async session using `async_session_factory` from `core.database`
- For each entity type: check count first, skip if data exists
- Print progress: `"✅ Created 3 users"`, `"⏭️ Skipping personnel (6 already exist)"`
- Print summary at end: total created by type
- Handle errors gracefully: if one section fails, continue with next, print error
- Commit after each section (not one big transaction)

**Password hashing:** Use `from core.security import hash_password` (or whatever the existing function name is — check Phase 2 report: it uses passlib/bcrypt).

**Creating entities:** Use the repository/service functions from each module where possible. If direct model creation is simpler, use SQLAlchemy directly:
```python
from modules.devices.models import Device
device = Device(serial_number="IU-001", device_type="IU", status="WORKING")
db.add(device)
await db.flush()
```

---

### MODIFIED FILES

**`main.py`** — Full replacement. Keep ALL existing 17 router includes and add 1:
```python
from modules.settings.router import router as settings_router
app.include_router(settings_router, prefix="/api/v1/settings", tags=["Settings"])
```
Also update `version` to `"1.0.0"`.

**`migrations/env.py`** — Full replacement. Keep ALL existing model imports and add:
```python
from modules.settings.models import SystemSetting
```

**`routes.tsx`** — Full replacement. Replace the last 2 PlaceholderPages:
```typescript
import LocationHistoryPage from '@/modules/location_history/pages/LocationHistoryPage';
import SettingsPage from '@/modules/settings/pages/SettingsPage';
```
All routes should now point to real page components. **No more PlaceholderPage imports needed** (but keep the PlaceholderPage component file — don't delete it).

---

## VERIFICATION STEPS

1. **Rebuild:**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

2. **Run migration** (for system_settings table):
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "add_system_settings"
   docker compose exec backend alembic upgrade head
   ```

3. **Run seed script:**
   ```bash
   docker compose exec backend python -m shared.seed
   ```
   Expected output:
   ```
   NavDashboard Seed Script
   ========================
   ✅ Created 2 users (tech1, viewer1)
   ⏭️ Skipping personnel (6 already exist)
   ⏭️ Skipping devices (9 already exist)
   ⏭️ Skipping material templates (2 already exist)
   ⏭️ Skipping couples (4 already exist)
   ⏭️ Skipping pairs (2 already exist)
   ⏭️ Skipping error logs (6 already exist)
   ✅ Created 3 location history entries
   ✅ Created 6 default settings
   
   Seed complete!
   ```

4. **Get token:**
   ```bash
   TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@navdashboard.com","password":"admin123"}' | jq -r .access_token)
   ```

5. **Test settings:**
   ```bash
   curl -s http://localhost/api/v1/settings/ \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

6. **Test system info:**
   ```bash
   curl -s http://localhost/api/v1/settings/system-info \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

7. **Test location history:**
   ```bash
   curl -s "http://localhost/api/v1/locations/history?page=1&size=10" \
     -H "Authorization: Bearer $TOKEN" | jq .
   ```

8. **Test frontend pages:**
   - `/location-history` — select a couple, see timeline + map trail, expand entry to see materials snapshot
   - `/settings` → General tab → see system info + AI config + map defaults
   - `/settings` → User Management tab → see users, create user, edit role, toggle active
   - Run seed script again → should skip everything ("already exist")

9. **Test technician login:**
   ```bash
   TECH_TOKEN=$(curl -s -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"tech1@navdashboard.com","password":"tech123"}' | jq -r .access_token)
   
   # Should see settings but NOT User Management tab
   # Should NOT be able to update settings
   curl -s -X PUT http://localhost/api/v1/settings/ollama_url \
     -H "Authorization: Bearer $TECH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"value":"http://localhost:11434"}' | jq .
   # Should return 403
   ```

10. **Verify ALL routes are live** (no more PlaceholderPages):
    Navigate through every sidebar item. Every page should render real content (even if some are empty due to no data for that specific view).

11. **Verify existing features:**
    `/devices`, `/couples`, `/pairs`, `/map`, `/troubleshooting`, `/search`, `/audit`, `/comparison`, `/documents`, `/backup`, `/reports`, `/ai` all still work

---

## RULES REMINDER

- ✅ Generate ALL 18 files listed — complete contents, no abbreviation
- ✅ Use exact color hex values
- ✅ Use default imports: `import GlassCard from '...'` NOT `{ GlassCard }`
- ✅ main.py: keep ALL 17 existing router includes + add settings
- ✅ migrations/env.py: keep ALL existing model imports + add SystemSetting
- ✅ routes.tsx: ALL routes point to real pages — zero PlaceholderPages
- ✅ Seed script: safe to run multiple times, checks for existing data
- ✅ Settings: user management delegates to auth module — no duplicate CRUD
- ✅ Location history page: reuse existing backend endpoints, no new backend endpoints needed
- ❌ DO NOT modify any file not listed
- ❌ DO NOT abbreviate
- ❌ DO NOT skip any file
```