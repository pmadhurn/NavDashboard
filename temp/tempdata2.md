═══════════════════════════════════════════════════════════════
NAVDASHBOARD — CONTAINER PROMPT 15a: BACKEND — DASHBOARD + SEARCH + BACKUP
Stitch AFTER the Common Project Context prompt
═══════════════════════════════════════════════════════════════
YOUR TASK
Generate complete contents for the following 3 modules.

DASHBOARD MODULE (prefix: /dashboard)
Files:

NavDashboard/backend/modules/dashboard/__init__.py
NavDashboard/backend/modules/dashboard/schemas.py
NavDashboard/backend/modules/dashboard/router.py
NavDashboard/backend/modules/dashboard/service.py
NavDashboard/backend/modules/dashboard/repository.py
Note: No dedicated models needed — queries aggregate across other modules.

NavDashboard/backend/modules/dashboard/models.py → create as empty
file with a comment: # No dedicated models — dashboard queries across other modules

Endpoints:

GET /stats → total pairs, couples, devices; counts by status; counts by type
GET /error-trends → error counts over time (daily/weekly/monthly)
GET /status-distribution → pie chart data (working/not working/faulty)
GET /recent-activity → last 20 audit log entries
GET /device-type-breakdown → bar chart data by device type
GET /location-overview → map summary stats
Service performs aggregation queries across device, couple, pair, and error tables.

SEARCH MODULE (prefix: /search)
Files:
6. NavDashboard/backend/modules/search/__init__.py
7. NavDashboard/backend/modules/search/schemas.py
8. NavDashboard/backend/modules/search/router.py
9. NavDashboard/backend/modules/search/service.py
10. NavDashboard/backend/modules/search/repository.py
11. NavDashboard/backend/modules/search/indexer.py

Note: No dedicated models needed.

NavDashboard/backend/modules/search/models.py → create as empty
file with a comment: # No dedicated models — search queries across other modules

Endpoints:

GET /global?q=... → search across ALL entities (devices, couples,
pairs, personnel, errors) using PostgreSQL full-text search (pg_trgm)
GET /advanced → accepts multiple filter params for precise queries
GET /suggestions?q=... → autocomplete suggestions
indexer.py:

Build and maintain trigram indexes
Search ranking logic
BACKUP MODULE (prefix: /backup)
Files:
12. NavDashboard/backend/modules/backup/__init__.py
13. NavDashboard/backend/modules/backup/schemas.py
14. NavDashboard/backend/modules/backup/router.py
15. NavDashboard/backend/modules/backup/service.py
16. NavDashboard/backend/modules/backup/repository.py
17. NavDashboard/backend/modules/backup/exporter.py
18. NavDashboard/backend/modules/backup/importer.py
19. NavDashboard/backend/modules/backup/pg_dump_handler.py

NavDashboard/backend/modules/backup/models.py → create as empty
file with a comment: # No dedicated models for backup module

Endpoints:

POST /pg-dump → trigger pg_dump, return download link
POST /pg-restore → upload dump file, restore
GET /pg-dump/download/{filename} → download backup file
POST /export/xlsx → export all data as XLSX (multiple sheets)
POST /export/csv → export as CSV zip
POST /import/xlsx → upload XLSX, parse and import into DB (Business Rule #10: upsert)
POST /import/csv → upload CSV zip, parse and import (Business Rule #10: upsert)
GET /history → list of past backups with timestamps and sizes
exporter.py:

Export each table as a sheet in XLSX (using openpyxl)
Sheets: Devices, Couples, Pairs, Locations, LocationHistory,
Personnel, ErrorLogs, TroubleshootEntries, FittingMaterials, etc.
Include headers, proper formatting
importer.py:

Parse uploaded XLSX/CSV
Validate data integrity
Upsert records (Business Rule #10)
Return import summary (created, updated, errors)
pg_dump_handler.py:

Execute pg_dump via subprocess within the db container
Save to /backups volume
Execute pg_restore for restoration
OUTPUT FORMAT
Return every file with full path header and complete contents.

═══════════════════════════════════════════════════════════════
NAVDASHBOARD — CONTAINER PROMPT 15b: BACKEND — REPORTS + COMPARISON + DOCUMENTS + AUDIT
Stitch AFTER the Common Project Context prompt
═══════════════════════════════════════════════════════════════
YOUR TASK
Generate complete contents for the following 4 modules.

REPORTS MODULE (prefix: /reports)
Files:

NavDashboard/backend/modules/reports/__init__.py
NavDashboard/backend/modules/reports/schemas.py
NavDashboard/backend/modules/reports/router.py
NavDashboard/backend/modules/reports/service.py
NavDashboard/backend/modules/reports/repository.py
NavDashboard/backend/modules/reports/generators.py
NavDashboard/backend/modules/reports/templates_pdf.py
NavDashboard/backend/modules/reports/models.py → create as empty
file with a comment: # No dedicated models — reports generate from other module data

Endpoints:

POST /generate → generate report with given parameters
GET /templates → available report templates
GET /download/{id} → download generated report
generators.py:

PDF generation using ReportLab
Excel generation using xlsxwriter
Report types: Device Inventory, Error Summary, Location History,
Pair Status, Full System Report
templates_pdf.py:

PDF layout templates with NavDashboard branding
Tables, headers, footers
COMPARISON MODULE (prefix: /comparison)
Files:
8. NavDashboard/backend/modules/comparison/__init__.py
9. NavDashboard/backend/modules/comparison/schemas.py
10. NavDashboard/backend/modules/comparison/router.py
11. NavDashboard/backend/modules/comparison/service.py
12. NavDashboard/backend/modules/comparison/repository.py

NavDashboard/backend/modules/comparison/models.py → create as empty
file with a comment: # No dedicated models — comparison fetches from other modules

Endpoints:

POST /couples → compare two couples side by side
(body: {couple_id_1, couple_id_2})
POST /pairs → compare two pairs
POST /devices → compare two devices
Service returns:

All fields of both entities
matches: fields with same values (highlighted #4F7A63)
differences: fields with different values (highlighted #8A5C3C)
Includes nested data (devices, materials, location, config)
DOCUMENTS MODULE (prefix: /documents)
Files:
13. NavDashboard/backend/modules/documents/__init__.py
14. NavDashboard/backend/modules/documents/models.py
15. NavDashboard/backend/modules/documents/schemas.py
16. NavDashboard/backend/modules/documents/router.py
17. NavDashboard/backend/modules/documents/service.py
18. NavDashboard/backend/modules/documents/repository.py
19. NavDashboard/backend/modules/documents/storage.py

Document model:

id: UUID
filename: String
file_type: String (pdf, image, doc, etc.)
file_size: Integer
storage_path: String (MinIO object key)
entity_type: String (device, couple, pair, error, general)
entity_id: UUID, nullable
uploaded_by: UUID FK → users.id
description: Text, nullable
Inherits: Base, SoftDeleteMixin
Endpoints:

POST /upload → upload file (multipart)
GET /{id} → get document metadata
GET /{id}/download → download file
DELETE /{id} → soft delete
GET /by-entity/{entity_type}/{entity_id} → all docs for an entity
storage.py:

MinIO client wrapper
Upload, download, delete objects
Generate presigned URLs
AUDIT TRAIL MODULE (prefix: /audit)
Files:
20. NavDashboard/backend/modules/audit_trail/__init__.py
21. NavDashboard/backend/modules/audit_trail/schemas.py
22. NavDashboard/backend/modules/audit_trail/router.py
23. NavDashboard/backend/modules/audit_trail/service.py
24. NavDashboard/backend/modules/audit_trail/repository.py

NavDashboard/backend/modules/audit_trail/models.py → create as empty
file with a comment: # Uses AuditLog model from shared/audit.py

Uses the AuditLog model from shared/audit.py.

Endpoints:

GET / → list all audit entries (paginated, filterable by entity_type,
entity_id, action, user, date range)
GET /entity/{entity_type}/{entity_id} → audit history for specific entity
GET /user/{user_id} → all actions by a user
GET /stats → action counts by type, most active users, most changed entities
OUTPUT FORMAT
Return every file for ALL modules above with full path headers and
complete contents.

═══════════════════════════════════════════════════════════════
NAVDASHBOARD — CONTAINER PROMPT 16: BACKEND MODULE — IoT (STUB)
Stitch AFTER the Common Project Context prompt
═══════════════════════════════════════════════════════════════
YOUR TASK
Generate complete STUB contents (functional structure, ready to
be filled in later) for:

NavDashboard/backend/modules/iot/__init__.py
NavDashboard/backend/modules/iot/models.py
NavDashboard/backend/modules/iot/schemas.py
NavDashboard/backend/modules/iot/router.py
NavDashboard/backend/modules/iot/service.py
NavDashboard/backend/modules/iot/repository.py
NavDashboard/backend/modules/iot/mqtt_handler.py
MODELS (Placeholder)
IoTDevice

id: UUID
device_id: UUID FK → devices.id
mqtt_topic: String
last_ping: DateTime, nullable
auto_status_enabled: Boolean, default False
SensorReading

id: UUID
iot_device_id: UUID FK
reading_type: String (status, signal_strength, temperature, etc.)
value: JSONB
received_at: DateTime
ROUTER (prefix: /iot)
Stub endpoints:

GET /devices → list IoT-registered devices
POST /devices → register device for IoT
GET /readings/{device_id} → recent sensor readings
POST /webhook → receive data from Arduino/Pi via HTTP
All endpoints should return 501 Not Implemented with message
"IoT module coming soon" for now, but the structure should be
fully in place.

mqtt_handler.py
Stub with:

MQTT client connection setup (paho-mqtt)
Subscribe to topics
Message handler that would parse incoming data and update device status
All commented out but structurally complete
OUTPUT FORMAT
Return every file with full path header and complete contents.

═══════════════════════════════════════════════════════════════
NAVDASHBOARD — CONTAINER PROMPT 17: FRONTEND SETUP + CORE
Stitch AFTER the Common Project Context prompt
═══════════════════════════════════════════════════════════════
YOUR TASK
Generate complete contents of:

NavDashboard/frontend/Dockerfile
NavDashboard/frontend/package.json
NavDashboard/frontend/tsconfig.json
NavDashboard/frontend/tsconfig.node.json
NavDashboard/frontend/vite.config.ts
NavDashboard/frontend/index.html
NavDashboard/frontend/.env
NavDashboard/frontend/src/main.tsx
NavDashboard/frontend/src/app/App.tsx
NavDashboard/frontend/src/app/routes.tsx
NavDashboard/frontend/src/app/providers.tsx
NavDashboard/frontend/src/styles/global.css
NavDashboard/frontend/src/styles/theme.ts
NavDashboard/frontend/src/styles/glass.css
NavDashboard/frontend/src/shared/api/client.ts
NavDashboard/frontend/src/shared/api/endpoints.ts
NavDashboard/frontend/src/shared/types/index.ts
NavDashboard/frontend/src/shared/types/devices.ts
NavDashboard/frontend/src/shared/types/couples.ts
NavDashboard/frontend/src/shared/types/pairs.ts
NavDashboard/frontend/src/shared/types/locations.ts
NavDashboard/frontend/src/shared/types/common.ts
NavDashboard/frontend/src/shared/utils/formatters.ts
NavDashboard/frontend/src/shared/utils/validators.ts
NavDashboard/frontend/src/shared/utils/colors.ts
NavDashboard/frontend/src/shared/utils/mapHelpers.ts
NavDashboard/frontend/src/shared/hooks/useApi.ts
NavDashboard/frontend/src/shared/hooks/useAuth.ts
NavDashboard/frontend/src/shared/hooks/useDebounce.ts
NavDashboard/frontend/src/shared/hooks/useLocalStorage.ts
NavDashboard/frontend/src/shared/stores/authStore.ts
NavDashboard/frontend/src/shared/stores/uiStore.ts
DOCKERFILE
Stage 1 (build): node:20-alpine, install deps, build with Vite
Stage 2 (serve): nginx:alpine, copy build output, serve static
Expose 3000
package.json
Dependencies:

react, react-dom (18.x)
react-router-dom (6.x)
antd (5.x)
@ant-design/icons
leaflet, react-leaflet, @types/leaflet
recharts (for charts)
zustand (state management)
@tanstack/react-query
axios
dayjs
classnames
react-hot-toast (notifications)
Dev dependencies:

typescript, @types/react, @types/react-dom
vite, @vitejs/plugin-react
eslint, prettier
Scripts:

dev, build, preview, lint
THEME (theme.ts)
Export the COMPLETE color palette as a TypeScript object matching
every color defined in the Common Prompt. Also export Ant Design
theme config override to apply the dark glass theme globally.

GLASS CSS (glass.css)
Define reusable CSS classes:

.glass-card — standard glass card with blur, transparency, border
.glass-card-hover — with hover glow effect
.glass-sidebar — sidebar-specific glass
.glass-modal — modal glass
.glass-input — input field glass
.glass-button — button glass
.glass-popup — map popup glass
.glass-badge — tag/badge glass
ALL must use backdrop-filter: blur(...) and rgba backgrounds.
Transparency is KEY — NOT matte.

global.css
CSS reset / normalize
Apply dark background (#0A0A0A) to body
Global font: Inter or system font stack
Scrollbar styling (thin, dark)
Selection color
Override Ant Design styles to match glass theme
routes.tsx
Define all routes:

/ → Dashboard
/devices → Device List
/devices/:id → Device Detail
/couples → Couple List
/couples/:id → Couple Detail
/pairs → Pair List
/pairs/:id → Pair Detail
/map → Map View
/troubleshooting → Troubleshooting
/ai → AI Chat
/location-history → Location History
/backup → Backup & Restore
/comparison → Comparison
/search → Advanced Search
/documents → Documents
/audit → Audit Trail
/reports → Reports
/settings → Settings
/login → Login (no layout)
Protected routes require auth. Login is public.

API client (client.ts)
Axios instance with base URL from env
Request interceptor: attach JWT from localStorage
Response interceptor: handle 401 (redirect to login)
MUST match interface contract: api.get<T>, api.post<T>, api.put<T>, api.del<T>
endpoints.ts
All backend endpoint URLs as constants
Organized by module (DEVICES, COUPLES, PAIRS, etc.)
Type files
Define TypeScript interfaces matching ALL backend Pydantic schemas.
Fully typed, no any.
common.ts MUST include PaginatedResponse<T> matching the interface contract.

colors.ts
Export ALL color values from the palette as named constants.
Also export helper functions:

getStatusColor(status) → returns hex color
getSeverityColor(severity) → returns hex color
getDeviceTypeColor(type) → returns hex color
authStore.ts (Zustand)
Stores: token, user, isAuthenticated
Actions: setToken, setUser, logout, initialize (from localStorage)
uiStore.ts (Zustand)
Stores: sidebarCollapsed, currentPageTitle
Actions: toggleSidebar, setPageTitle
OUTPUT FORMAT
Return every file with full path header and complete contents.

═══════════════════════════════════════════════════════════════
NAVDASHBOARD — CONTAINER PROMPT 18: FRONTEND SHARED COMPONENTS
Stitch AFTER the Common Project Context prompt
═══════════════════════════════════════════════════════════════
YOUR TASK
Generate complete contents of:

NavDashboard/frontend/src/shared/components/Layout.tsx
NavDashboard/frontend/src/shared/components/Sidebar.tsx
NavDashboard/frontend/src/shared/components/DataTable.tsx
NavDashboard/frontend/src/shared/components/DynamicForm.tsx
NavDashboard/frontend/src/shared/components/ConfirmDialog.tsx
NavDashboard/frontend/src/shared/components/StatusBadge.tsx
NavDashboard/frontend/src/shared/components/GlassCard.tsx
NavDashboard/frontend/src/shared/components/GlassButton.tsx
NavDashboard/frontend/src/shared/components/GlassInput.tsx
NavDashboard/frontend/src/shared/components/GlassModal.tsx
NavDashboard/frontend/src/shared/components/PageHeader.tsx
NavDashboard/frontend/src/shared/components/LoadingSpinner.tsx
NavDashboard/frontend/src/shared/components/EmptyState.tsx
NavDashboard/frontend/src/shared/components/ErrorBoundary.tsx
DESIGN RULES FOR ALL SHARED COMPONENTS
Every component uses the liquid-glass aesthetic
Use backdrop-filter: blur(20px) and rgba backgrounds everywhere
More transparency, less matte — the UI must feel like layered glass
Use the exact color palette from the theme
All components must be fully typed (TypeScript strict)
All components must be reusable and accept customization via props
Layout.tsx
Main application layout wrapper
Structure:
Fixed glass sidebar on the left (collapsible)
Top bar with: page title, global search input, user avatar/menu
Main content area (scrollable)
The top bar should have glass effect (blur, transparency)
Content area has subtle glass background
Responsive: sidebar collapses to icons on small screens
Accepts children as main content
Uses uiStore for sidebar collapsed state
Sidebar.tsx
Glass sidebar with background #0F0F0F + transparency
Logo/brand at top ("NavDashboard" text with subtle glow)
Navigation items with icons (Ant Design Icons):
Dashboard (HomeOutlined)
Devices (ApiOutlined)
Couples (LinkOutlined)
Pairs (SwapOutlined)
Map (EnvironmentOutlined)
Troubleshooting (ToolOutlined)
AI Assistant (RobotOutlined)
Location History (HistoryOutlined)
Documents (FileOutlined)
Reports (BarChartOutlined)
Audit Trail (AuditOutlined)
Search (SearchOutlined)
Comparison (DiffOutlined)
Backup (CloudDownloadOutlined)
Settings (SettingOutlined)
Active item: #1E1E1E background with left accent border
Hover: #1A1A1A background
Icons: #C8C8C8
Collapsible: full width shows icon + label, collapsed shows icon only
Bottom: user info pill (avatar + name), logout button
Uses uiStore for collapsed state
DataTable.tsx
Generic reusable table component wrapping Ant Design Table
Glass-styled: transparent header #151515, alternating rows
#111111, hover #1C1C1C, selected #242424
Props:
columns: column definitions (typed)
data: array of items
loading: boolean
pagination: PaginatedResponse compatible (page, size, total)
onPageChange: callback
onRowClick: callback
selectedRowKeys: for multi-select
onSelectionChange: callback
filters: active filters display
sortable: enable column sorting
exportable: show export button (XLSX/CSV)
Built-in: empty state, loading skeleton, row status color stripe
Scrollable with sticky header
DynamicForm.tsx
JSON-schema-driven form generator
Accepts a form schema definition (array of field configs):
ts
interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' |
        'date' | 'boolean' | 'coordinate' | 'json' | 'file';
  required?: boolean;
  options?: { label: string; value: any }[];
  placeholder?: string;
  defaultValue?: any;
  rules?: ValidationRule[];
  span?: number;
}

Renders a glass-styled form with Ant Design form items
Supports custom_fields: render additional dynamic fields from JSONB
All inputs use glass styling (GlassInput)
Submit and Cancel buttons (GlassButton)
Loading state during submission
ConfirmDialog.tsx
Glass-styled modal for delete/destructive action confirmations
Props: title, message, confirmText, cancelText, onConfirm, onCancel,
danger (boolean for red styling), loading
Uses GlassModal underneath
Danger variant uses #8A3A3A accent
StatusBadge.tsx
Displays device/couple/pair status as a colored badge
Props: status ('WORKING' | 'NOT_WORKING' | 'FAULTY'), size
Colors: Working #5F8F6B, Not Working #B68A3C, Faulty #9B3E3E
Subtle glass background with colored dot + text
Optional: pulsing dot animation for "Working" status
GlassCard.tsx
The foundational glass container component
Props:
children
className
hoverable (boolean — adds glow on hover)
padding (sm | md | lg)
onClick
accentColor (optional top/left border color)
fullHeight (boolean)
Style:
css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.06);
border-radius: 16px;
Hover effect (if hoverable):
css
background: rgba(255, 255, 255, 0.05);
border-color: rgba(255, 255, 255, 0.1);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
MUST feel transparent and layered — NOT flat/matte
GlassButton.tsx
Glass-styled button component
Props: variant ('primary' | 'secondary' | 'danger' | 'ghost'),
size, loading, disabled, icon, children, onClick, fullWidth
Primary: #E6E6E6 bg, #0A0A0A text, glass blur
Secondary: #2A2A2A bg with transparency
Danger: #8A3A3A with transparency
Ghost: fully transparent, border only
Disabled: #3A3A3A, reduced opacity
Hover: subtle brightness increase + glow
GlassInput.tsx
Glass-styled input field
Props: type, placeholder, value, onChange, prefix icon, suffix,
error (string), disabled , size

Style: transparent background, border #2A2A2A, focus ring #C9C9C9
Error state: border #A14242
Also supports textarea variant
Wraps Ant Design Input with custom glass styling
GlassModal.tsx
Glass-styled modal dialog
Props: open, onClose, title, children, footer, width, closable
Overlay: dark translucent backdrop
Modal body:
css
background: rgba(20, 20, 20, 0.85);
backdrop-filter: blur(30px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
Smooth open/close animation (scale + fade)
Title styled with primary text color
Close button: subtle glass circle
PageHeader.tsx
Page title + breadcrumb + action buttons area
Props: title, subtitle, breadcrumbs (array), actions (ReactNode[])
Glass bottom border separator
Title: large, #F2F2F2
Subtitle: #B8B8B8
LoadingSpinner.tsx
Centered spinner for loading states
Props: size ('sm' | 'md' | 'lg'), text (optional), fullPage (boolean)
Uses subtle glass card as container
Spinner color: #E6E6E6
Optional pulsing text below
EmptyState.tsx
Displayed when a list/table has no data
Props: icon, title, description, actionButton (ReactNode)
Glass card container
Muted icon and text
Optional action button (e.g., "Add First Device")
ErrorBoundary.tsx
React error boundary wrapper
Catches render errors, displays a glass-styled error card
Shows: error icon, "Something went wrong" message, error details
(collapsible), retry button
Error accent: #9B3E3E
Logs error to console
OUTPUT FORMAT
Return every file with full path header and complete contents.
Do not abbreviate. Use the exact colors from the palette.
Every component must have the glass transparency feel.

PROMPT 19 — Frontend Module: Dashboard
markdown
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 19: FRONTEND MODULE — DASHBOARD
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/dashboard/pages/DashboardPage.tsx`
2. `NavDashboard/frontend/src/modules/dashboard/components/StatsCards.tsx`
3. `NavDashboard/frontend/src/modules/dashboard/components/StatusOverview.tsx`
4. `NavDashboard/frontend/src/modules/dashboard/components/RecentActivity.tsx`
5. `NavDashboard/frontend/src/modules/dashboard/components/DeviceChart.tsx`
6. `NavDashboard/frontend/src/modules/dashboard/components/ErrorTrendChart.tsx`
7. `NavDashboard/frontend/src/modules/dashboard/components/PairStatusPie.tsx`

---

## DashboardPage.tsx

- Main dashboard layout using CSS grid
- Top row: 4 stat cards (Total Pairs, Total Devices, Active Errors,
  Uptime %)
- Second row: StatusOverview (left, wider) + PairStatusPie (right)
- Third row: DeviceChart (left) + ErrorTrendChart (right)
- Bottom row: RecentActivity (full width)
- All sections in GlassCard containers
- Fetches data from `/api/v1/dashboard/stats`, `/error-trends`,
  `/status-distribution`, `/recent-activity`, `/device-type-breakdown`
- Loading skeletons while data fetches
- Uses TanStack Query hooks

---

## StatsCards.tsx

- 4 glass cards in a row
- Each card shows:
  - Icon (top left, muted)
  - Label (secondary text)
  - Value (large primary text)
  - Trend indicator (up/down arrow + percentage, optional)
- Card backgrounds: `#141414` with glass transparency
- Subtle accent edge on left side: `#2E2E2E`
- Hover: gentle glow

---

## StatusOverview.tsx

- Horizontal bar or segmented bar showing proportion of:
  Working (green `#5F8F6B`) / Not Working (amber `#B68A3C`) / Faulty (red `#9B3E3E`)
- Below the bar: count labels for each status
- Device-level, Couple-level, and Pair-level rows
- Glass card container

---

## RecentActivity.tsx

- List of recent audit log entries
- Each entry shows: timestamp, action icon (create/update/delete),
  entity type + name, user who did it, brief description
- Timeline-style layout with glass line
- Create: `#5F8F6B` dot | Update: `#7A7A7A` dot | Delete: `#9B3E3E` dot
- "View All" link at bottom → navigates to Audit Trail page

---

## DeviceChart.tsx

- Bar chart (Recharts) showing device count by type (IU, OU, HC, RF)
- Each bar colored with device type colors (IU `#6B7F8C`, OU `#8C6B7C`,
  HC `#6B8C7A`, RF `#8C836B`)
- Glass card container
- Dark chart background, grid lines `#262626`
- Axis labels: `#B8B8B8`
- Tooltip: glass styled

---

## ErrorTrendChart.tsx

- Line chart (Recharts) showing error count over time
- X-axis: dates | Y-axis: count
- Line color: chart series 1 `#D6D6D6`
- Optional: stacked area by severity (series 1-4 colors)
- Glass card container
- Dark background, grid `#262626`

---

## PairStatusPie.tsx

- Pie/donut chart (Recharts) showing pair status distribution
- Slices: Working `#5F8F6B`, Not Working `#B68A3C`, Faulty `#9B3E3E`
- Center label: total count
- Glass card container
- Legend below chart
- Hover: slice expands slightly

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
Use exact palette colors. Glass aesthetic on everything.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 20: FRONTEND MODULE — DEVICES
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/devices/pages/DeviceListPage.tsx`
2. `NavDashboard/frontend/src/modules/devices/pages/DeviceDetailPage.tsx`
3. `NavDashboard/frontend/src/modules/devices/components/DeviceTable.tsx`
4. `NavDashboard/frontend/src/modules/devices/components/DeviceForm.tsx`
5. `NavDashboard/frontend/src/modules/devices/components/DeviceStatusBadge.tsx`
6. `NavDashboard/frontend/src/modules/devices/hooks/useDevices.ts`

---

## DeviceListPage.tsx

- PageHeader: "Devices" title, breadcrumb, "Add Device" button (GlassButton)
- Filter bar: dropdowns for device type, status, couple assignment
- Search input for serial number (with debounce)
- DeviceTable below
- Glass containers throughout

---

## DeviceDetailPage.tsx

- Fetches single device by ID from URL param
- Glass card layout:
  - Top: device serial number (large), status badge, type tag
  - Info grid: serial, type, status, couple assignment, handling person,
    created date, last updated
  - Custom fields section (rendered from JSONB)
  - Status history timeline
  - Error/troubleshooting history
  - Attached documents
  - Edit button → opens DeviceForm in modal
  - Delete button → ConfirmDialog

---

## DeviceTable.tsx

- Uses shared DataTable component
- Columns: Serial Number, Type (color-tagged), Status (StatusBadge),
  Couple (linked), Handling Person, Last Updated, Actions (edit, delete)
- Row click → navigate to detail page
- Bulk selection for bulk status update

---

## DeviceForm.tsx

- Used for both Create and Edit (detects mode from props)
- Fields:
  - Serial Number (text input)
  - Device Type (select: IU, OU, HC, RF)
  - Status (select with color indicators)
  - Couple (searchable select dropdown)
  - Handling Person (searchable select dropdown)
  - Notes (textarea)
  - Custom Fields (dynamic key-value pairs, addable/removable)
- All glass-styled inputs
- Submit creates/updates via API

---

## DeviceStatusBadge.tsx

- Thin wrapper around shared StatusBadge
- Adds device-type-specific icon next to status

---

## useDevices.ts

- TanStack Query hooks (MUST follow interface contract hook pattern):
  - `useDevices(filters)` → paginated list
  - `useDevice(id)` → single device
  - `useCreateDevice()` → mutation
  - `useUpdateDevice()` → mutation
  - `useDeleteDevice()` → mutation
  - `useUpdateDeviceStatus()` → mutation
  - `useDeviceStatusHistory(id)` → status changes
  - `useDeviceStats()` → aggregation data

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 21: FRONTEND MODULE — COUPLES
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/couples/pages/CoupleListPage.tsx`
2. `NavDashboard/frontend/src/modules/couples/pages/CoupleDetailPage.tsx`
3. `NavDashboard/frontend/src/modules/couples/components/CoupleCard.tsx`
4. `NavDashboard/frontend/src/modules/couples/components/CoupleForm.tsx`
5. `NavDashboard/frontend/src/modules/couples/components/MaterialSelector.tsx`
6. `NavDashboard/frontend/src/modules/couples/hooks/useCouples.ts`

---

## CoupleListPage.tsx

- Toggle view: Card Grid / Table view
- Filter bar: status, pair assignment, has RF, location
- Card grid shows CoupleCard components
- Table view uses DataTable

---

## CoupleDetailPage.tsx

- Top: couple name, status badge, pair assignment
- Left column: device list (IU, OU, HC, RF if present) — each linked
- Right column: current location (mini map preview using Leaflet),
  coordinates, address note
- Materials section: list of fitting materials
- Configuration section: JSONB config viewer
- Location history timeline (with mini trail map)
- Error history
- Documents
- Edit / Delete actions

---

## CoupleCard.tsx

- Glass card showing couple summary
- Shows: name, status badge, device count, location snippet,
  has RF indicator, pair name
- Hover: glass glow effect
- Click → navigate to detail page

---

## CoupleForm.tsx

- Create / Edit couple
- Fields:
  - Name
  - Pair (searchable select, optional)
  - Has RF (toggle)
  - IU device (searchable select from available devices, or create new)
  - OU device (same)
  - HC device (same)
  - RF device (conditional, shown only if Has RF is on)
  - Location (coordinate picker — click on mini map or enter lat/lng)
  - Handling Person (searchable select)
  - Fitting Materials (MaterialSelector component)
  - Configuration (JSON editor or key-value pairs)
  - Notes
  - Custom Fields
- "Copy from existing couple" button → opens selector, pre-fills
  materials and config (suggestive completion)

---

## MaterialSelector.tsx

- Multi-item selector for fitting materials
- Each row: material name (with autocomplete suggestions from DB),
  quantity, unit
- Add row / Remove row buttons
- "Copy from template" dropdown → select a MaterialTemplate
- "Copy from couple" dropdown → select existing couple, load its materials
- Autocomplete queries `/api/v1/inventory/suggestions?query=...`
- Glass-styled inputs

---

## useCouples.ts

- TanStack Query hooks (MUST follow interface contract hook pattern):
  - `useCouples(filters)` → paginated list
  - `useCouple(id)` → single couple with nested data
  - `useCreateCouple()` → mutation
  - `useUpdateCouple()` → mutation
  - `useDeleteCouple()` → mutation
  - `useUpdateCoupleLocation()` → mutation (triggers history)
  - `useCoupleLocationHistory(id)` → location history
  - `useCoupleMapData()` → all couples for map
  - `useDuplicateCouple()` → duplicate config

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 22: FRONTEND MODULE — PAIRS
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/pairs/pages/PairListPage.tsx`
2. `NavDashboard/frontend/src/modules/pairs/pages/PairDetailPage.tsx`
3. `NavDashboard/frontend/src/modules/pairs/components/PairCard.tsx`
4. `NavDashboard/frontend/src/modules/pairs/components/PairForm.tsx`
5. `NavDashboard/frontend/src/modules/pairs/hooks/usePairs.ts`

---

## PairListPage.tsx

- Card grid and table toggle (like couples)
- Filters: status
- Each pair card shows both couples summarized

---

## PairDetailPage.tsx

- Top: pair name, status badge
- Two-column layout showing Couple A and Couple B side by side
- Each couple column: mini CoupleCard with devices, location, materials
- Combined error history timeline
- Combined location history
- Map showing both couples' locations with a line between them
- Edit / Delete actions

---

## PairCard.tsx

- Glass card: pair name, status, couple A summary, couple B summary
- Status color stripe on left edge
- Hover glow

---

## PairForm.tsx

- Create / Edit pair
- Fields:
  - Name
  - Couple A (searchable select from unassigned couples or create new)
  - Couple B (same)
  - Handling Person
  - Notes
  - Custom Fields
- Validation: exactly 2 couples (Business Rule #11)

---

## usePairs.ts

- TanStack Query hooks (MUST follow interface contract hook pattern)
- All pair CRUD operations
- `usePairStats()` for dashboard data

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 23: FRONTEND MODULE — MAP
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/map/pages/MapViewPage.tsx`
2. `NavDashboard/frontend/src/modules/map/components/MainMap.tsx`
3. `NavDashboard/frontend/src/modules/map/components/DeviceMarker.tsx`
4. `NavDashboard/frontend/src/modules/map/components/DevicePopup.tsx`
5. `NavDashboard/frontend/src/modules/map/components/LocationPicker.tsx`
6. `NavDashboard/frontend/src/modules/map/components/MapFilters.tsx`
7. `NavDashboard/frontend/src/modules/map/components/LocationTrail.tsx`
8. `NavDashboard/frontend/src/modules/map/hooks/useMapData.ts`

---

## MapViewPage.tsx

- Full-page map with floating glass panels
- Left panel (collapsible): list of all couples/pairs with status
  badges, clickable to zoom to location
- Top-right: MapFilters floating glass panel
- Map fills remaining space
- Bottom-left: legend (status colors)

---

## MainMap.tsx

- Leaflet map using React-Leaflet
- Dark themed tile layer: CartoDB dark_all
  (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- Renders DeviceMarker for each couple with location
- Renders LocationTrail when a couple's history is selected
- Supports:
  - Zoom to fit all markers
  - Click on empty space → LocationPicker mode (if editing)
  - Marker clustering if many devices
- Map container has glass border

---

## DeviceMarker.tsx

- Custom Leaflet marker for each couple on the map
- Marker color based on status:
  - Working: `#5F8F6B`
  - Not Working: `#B68A3C`
  - Faulty: `#9B3E3E`
- Custom SVG marker icon (circle with glow effect)
- Selected/hover state: `#F2F2F2` ring
- Shows couple name as tooltip on hover
- Click opens DevicePopup

---

## DevicePopup.tsx

- Leaflet popup with glass styling
- Background: `#141414` with glass transparency
- Shows:
  - Couple name + status badge
  - Pair name (if assigned)
  - Device list (IU serial, OU serial, HC serial, RF serial if present)
  - Handling person
  - Has RF indicator
  - Coordinates
  - Last moved date
  - Quick links: "View Detail", "Edit Location", "View History"
- Compact layout, scrollable if needed

---

## LocationPicker.tsx

- Component that enables click-to-set-location on map
- When active: cursor changes, clicking sets a marker
- Shows selected coordinates in a floating glass panel
- Confirm / Cancel buttons
- Can also manually enter lat/lng in input fields
- Used when creating or editing couple location

---

## MapFilters.tsx

- Floating glass panel (top-right of map)
- Filters:
  - Status checkboxes (Working, Not Working, Faulty)
  - Has RF toggle
  - Pair filter (dropdown)
  - Show/hide location trails toggle
- Applying filters shows/hides markers on map in real-time
- Collapsible (glass expand/collapse button)

---

## LocationTrail.tsx

- Polyline on the map showing a couple's location history
- Line color: `#7C7C7C`
- Each historical point: small circle marker with timestamp tooltip
- Direction indicators (arrows along line)
- Most recent location: full DeviceMarker
- Oldest location: faded marker
- Connects to location history data

---

## useMapData.ts

- TanStack Query hooks:
  - `useMapCouples(filters)` → all couples with coordinates for markers
  - `useCoupleTrail(coupleId)` → location history for trail rendering
- Transform data into Leaflet-friendly format

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
Use dark map tiles. All overlays use glass aesthetic.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 24: FRONTEND MODULE — TROUBLESHOOTING
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/troubleshooting/pages/TroubleshootingPage.tsx`
2. `NavDashboard/frontend/src/modules/troubleshooting/components/ErrorTimeline.tsx`
3. `NavDashboard/frontend/src/modules/troubleshooting/components/TroubleshootForm.tsx`
4. `NavDashboard/frontend/src/modules/troubleshooting/components/ErrorFilters.tsx`
5. `NavDashboard/frontend/src/modules/troubleshooting/hooks/useTroubleshooting.ts`

---

## TroubleshootingPage.tsx

- PageHeader: "Troubleshooting" + "Report Error" button (GlassButton)
- ErrorFilters bar
- Two views: Timeline view (ErrorTimeline) and Table view (DataTable)
- Toggle between views
- Stats bar at top: Open errors, Resolved today, Critical count

---

## ErrorTimeline.tsx

- Vertical timeline showing error logs chronologically
- Each entry: glass card with:
  - Severity badge (color-coded)
  - Error type
  - Description (truncated, expandable)
  - Entity reference (device/couple/pair name, linked)
  - Reported by, reported at
  - Resolution status (open/resolved)
  - Expand → shows troubleshoot steps
- Timeline line: `#2C2C2C`
- Severity dot colors: Low `#6E6E6E`, Medium `#B68A3C`, High `#9B3E3E`,
  Critical `#6E2C2C`

---

## TroubleshootForm.tsx

- Form to report a new error OR add troubleshoot step
- Mode 1 (New Error):
  - Entity type selector (device/couple/pair)
  - Entity selector (searchable)
  - Error type (text with suggestions)
  - Severity (select)
  - Description (textarea)
  - Reported by (person selector)
  - Custom fields (dynamic key-value)
- Mode 2 (Add Step):
  - Step description
  - Action taken
  - Resolution (if resolved)
  - Resolved by
- Mode 3 (Resolve):
  - Resolution notes
  - Resolved by
- All glass-styled

---

## ErrorFilters.tsx

- Filter bar:
  - Severity (multi-select)
  - Status (open/resolved)
  - Entity type
  - Date range
  - Reported by
  - Error type
- Active filters shown as removable glass tags

---

## useTroubleshooting.ts

- Hooks (MUST follow interface contract hook pattern):
  - `useErrors(filters)` → paginated list
  - `useError(id)` → single error with steps
  - `useCreateError()` → mutation
  - `useAddStep()` → mutation
  - `useResolveError()` → mutation
  - `useErrorStats()` → aggregation
  - `useErrorsByEntity(type, id)` → filtered list

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 25: FRONTEND MODULE — AI CHAT
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/ai_chat/pages/AIChatPage.tsx`
2. `NavDashboard/frontend/src/modules/ai_chat/components/ChatWindow.tsx`
3. `NavDashboard/frontend/src/modules/ai_chat/components/ChatMessage.tsx`
4. `NavDashboard/frontend/src/modules/ai_chat/components/ChatInput.tsx`
5. `NavDashboard/frontend/src/modules/ai_chat/components/SuggestedQueries.tsx`
6. `NavDashboard/frontend/src/modules/ai_chat/components/SourceReference.tsx`
7. `NavDashboard/frontend/src/modules/ai_chat/hooks/useAIChat.ts`

---

## AIChatPage.tsx

- Two-panel layout:
  - Left sidebar (glass): chat session list (history), "New Chat" button
  - Right main area: ChatWindow
- If no session selected: show welcome screen with SuggestedQueries
- Glass aesthetic throughout
- Background: `#0B0B0B`

---

## ChatWindow.tsx

- Scrollable message area
- Messages alternate: user (right-aligned) and assistant (left-aligned)
- Auto-scroll to bottom on new message
- Loading indicator when AI is typing
- At bottom: ChatInput

---

## ChatMessage.tsx

- Single message bubble
- User messages: background `#2A2A2A`, aligned right
- AI messages: background `#141414`, aligned left
- AI messages may include:
  - Formatted text (markdown rendering)
  - Source references (SourceReference components at bottom)
  - Code blocks (if any)
- Timestamp below each message (muted)
- Glass styling on bubbles with subtle border

---

## ChatInput.tsx

- Glass-styled input bar at bottom of chat
- Text area (auto-expands, max 4 lines)
- Send button (GlassButton, primary)
- Keyboard shortcut: Enter to send, Shift+Enter for new line
- Disabled state while AI is responding
- Placeholder: "Ask about devices, troubleshooting, configurations..."

---

## SuggestedQueries.tsx

- Displayed on empty chat / welcome screen
- Grid of glass cards with pre-written queries:
  - "What is the status of all pairs?"
  - "Show me all faulty devices"
  - "How to troubleshoot OU connection issues?"
  - "List all devices at [location]"
  - "What errors were reported this week?"
  - "Compare Couple A1 and Couple B2"
- Clicking a suggestion sends it as a message
- Glass card hover effect

---

## SourceReference.tsx

- Small pill/tag showing the source of AI's information
- Shows: entity type icon + entity name + "View" link
- Example: "📟 Device SN-A0042 — View"
- Clicking opens the entity's detail page in a new tab
- Glass-styled pill

---

## useAIChat.ts

- Hooks:
  - `useChatSessions()` → list sessions
  - `useChatMessages(sessionId)` → messages in a session
  - `useSendMessage()` → mutation, supports streaming
  - `useCreateSession()` → create new chat
  - `useDeleteSession()` → delete
- Streaming support: use SSE (EventSource) or fetch streaming
  to receive tokens incrementally from `/api/v1/ai/chat/stream`
- Update message content as tokens arrive (typewriter effect)

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 26: FRONTEND MODULE — LOCATION HISTORY
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/frontend/src/modules/location_history/pages/LocationHistoryPage.tsx`
2. `NavDashboard/frontend/src/modules/location_history/components/HistoryTimeline.tsx`
3. `NavDashboard/frontend/src/modules/location_history/components/HistoryMap.tsx`
4. `NavDashboard/frontend/src/modules/location_history/hooks/useLocationHistory.ts`

---

## LocationHistoryPage.tsx

- PageHeader: "Location History"
- Couple selector (dropdown to pick a couple or "All")
- Two-panel layout:
  - Left: HistoryTimeline (scrollable list)
  - Right: HistoryMap (shows trail for selected couple)
- Date range filter
- Selecting an entry in timeline highlights it on map

---

## HistoryTimeline.tsx

- Vertical timeline of location changes
- Each entry (glass card):
  - Date + time
  - Old location → New location (with coordinates)
  - Distance moved
  - Handled by (person name)
  - Had RF: yes/no
  - Fitting materials at that location (expandable list)
  - Configuration snapshot (expandable JSON viewer)
- Timeline line: `#2C2C2C`
- Clickable: selecting an entry zooms the map to that location

---

## HistoryMap.tsx

- Leaflet map showing the movement trail for selected couple
- Uses LocationTrail component from map module
- Each historical point clickable → shows snapshot popup
- Current location: prominent marker
- Polyline connecting all points chronologically
- Fits bounds to show entire trail
- Dark CartoDB tile layer

---

## useLocationHistory.ts

- Hooks:
  - `useLocationHistory(coupleId, dateRange)` → paginated history
  - `useAllLocationHistory(filters)` → global history
  - `useCoupleTrailData(coupleId)` → formatted for map trail

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 27a: FRONTEND — BACKUP + SEARCH + DOCUMENTS
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents for the following 3 modules.

---

### BACKUP MODULE

1. `NavDashboard/frontend/src/modules/backup/pages/BackupPage.tsx`
2. `NavDashboard/frontend/src/modules/backup/components/BackupControls.tsx`
3. `NavDashboard/frontend/src/modules/backup/components/RestoreUploader.tsx`
4. `NavDashboard/frontend/src/modules/backup/components/BackupHistory.tsx`
5. `NavDashboard/frontend/src/modules/backup/components/ExportOptions.tsx`
6. `NavDashboard/frontend/src/modules/backup/hooks/useBackup.ts`

**BackupPage.tsx:**
- Two sections: "Database Backup" and "Data Export/Import"
- Database Backup section:
  - "Create Backup" button (triggers pg_dump)
  - BackupHistory list (past backups with download links)
  - "Restore from Backup" with RestoreUploader
- Data Export/Import section:
  - ExportOptions: checkboxes for which tables to export,
    format selector (XLSX/CSV), "Export" button → downloads file
  - "Import Data" with file uploader (XLSX/CSV)
  - Import preview: shows parsed data before confirming
  - Import summary after completion (created, updated, errors)

**BackupControls.tsx:**
- pg_dump trigger button with loading state
- Last backup info (timestamp, size)

**RestoreUploader.tsx:**
- Drag-and-drop file upload area (glass styled)
- Accepts .sql, .dump files for pg_restore
- Accepts .xlsx, .csv for data import
- Warning message: "This will overwrite existing data"
- Confirm dialog before restore

**BackupHistory.tsx:**
- Table of past backups: filename, timestamp, size, type (pg_dump/xlsx),
  download button, delete button

**ExportOptions.tsx:**
- Checklist of tables/entities to export
- "Select All" / "Deselect All"
- Format: XLSX or CSV
- Export button
- Download starts automatically on completion

**useBackup.ts:**
- Hooks for: create backup, restore, export, import, backup history

---

### SEARCH MODULE

7. `NavDashboard/frontend/src/modules/search/pages/SearchPage.tsx`
8. `NavDashboard/frontend/src/modules/search/components/GlobalSearch.tsx`
9. `NavDashboard/frontend/src/modules/search/components/SearchResults.tsx`
10. `NavDashboard/frontend/src/modules/search/components/AdvancedFilters.tsx`
11. `NavDashboard/frontend/src/modules/search/hooks/useSearch.ts`

**SearchPage.tsx:**
- Large search input at top (glass styled, prominent)
- AdvancedFilters panel (expandable)
- SearchResults below
- Result count and entity type breakdown

**GlobalSearch.tsx:**
- Also used in the top bar (Layout) as a compact search
- Expandable: clicking shows full search overlay
- Typeahead suggestions as you type (debounced 300ms)
- Results grouped by entity type (Devices, Couples, Pairs, etc.)
- Each result: icon, name, serial/ID, status badge, link to detail

**SearchResults.tsx:**
- Grouped by entity type with count badges
- Each result is a glass card with: entity icon, name, key info,
  status, link
- Highlight matching text in results

**AdvancedFilters.tsx:**
- Entity type checkboxes (search in: devices, couples, pairs, etc.)
- Status filter
- Date range
- Person filter
- Custom field search
- Glass panel, collapsible

**useSearch.ts:**
- Hooks for: global search, advanced search, suggestions

---

### DOCUMENTS MODULE

12. `NavDashboard/frontend/src/modules/documents/pages/DocumentsPage.tsx`
13. `NavDashboard/frontend/src/modules/documents/components/DocumentUploader.tsx`
14. `NavDashboard/frontend/src/modules/documents/components/DocumentViewer.tsx`
15. `NavDashboard/frontend/src/modules/documents/components/DocumentList.tsx`
16. `NavDashboard/frontend/src/modules/documents/hooks/useDocuments.ts`

**DocumentsPage.tsx:**
- PageHeader: "Documents" + "Upload" button
- Filter by entity type, file type
- DocumentList (grid or table view)

**DocumentUploader.tsx:**
- Drag-and-drop area (glass styled)
- Entity association: select entity type + entity
- Description field
- Multi-file support
- Upload progress bar
- Used both standalone and within entity detail pages

**DocumentViewer.tsx:**
- Preview for images (inline)
- Preview for PDFs (embedded viewer)
- Download button for all file types
- Metadata display: filename, size, uploaded by, date

**DocumentList.tsx:**
- Grid of file cards: thumbnail/icon, filename, size, entity, date
- Glass cards with hover effect
- Quick actions: download, delete, view

**useDocuments.ts:**
- Hooks for: list documents, upload, download, delete, by entity

---

## OUTPUT FORMAT

Return EVERY file for ALL modules above with full path headers
and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 27b: FRONTEND — COMPARISON + AUDIT + REPORTS
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents for the following 3 modules.

---

### COMPARISON MODULE

1. `NavDashboard/frontend/src/modules/comparison/pages/ComparisonPage.tsx`
2. `NavDashboard/frontend/src/modules/comparison/components/ComparisonSelector.tsx`
3. `NavDashboard/frontend/src/modules/comparison/components/ComparisonTable.tsx`
4. `NavDashboard/frontend/src/modules/comparison/components/DiffHighlighter.tsx`
5. `NavDashboard/frontend/src/modules/comparison/hooks/useComparison.ts`

**ComparisonPage.tsx:**
- Entity type selector (compare couples, pairs, or devices)
- ComparisonSelector: two dropdowns to pick entities
- "Compare" button (GlassButton)
- ComparisonTable shows results

**ComparisonSelector.tsx:**
- Two side-by-side searchable dropdowns
- Entity type selector above (radio or tabs)
- Glass styled

**ComparisonTable.tsx:**
- Two-column table: Entity A | Entity B
- Each row is a field (name, status, devices, materials, config, etc.)
- Matching values: highlighted with `#4F7A63`
- Different values: highlighted with `#8A5C3C`
- Nested comparisons for sub-entities (devices within couples, etc.)
- Glass card container

**DiffHighlighter.tsx:**
- Inline component that wraps a cell value
- Applies match or difference background color
- Shows old→new style diff for changed values

**useComparison.ts:**
- Hooks for: compare couples, compare pairs, compare devices

---

### AUDIT TRAIL MODULE

6. `NavDashboard/frontend/src/modules/audit_trail/pages/AuditTrailPage.tsx`
7. `NavDashboard/frontend/src/modules/audit_trail/components/AuditTimeline.tsx`
8. `NavDashboard/frontend/src/modules/audit_trail/components/AuditFilters.tsx`
9. `NavDashboard/frontend/src/modules/audit_trail/hooks/useAuditTrail.ts`

**AuditTrailPage.tsx:**
- PageHeader: "Audit Trail"
- AuditFilters
- AuditTimeline (default) or Table view toggle

**AuditTimeline.tsx:**
- Timeline of all system changes
- Each entry: action icon + color, entity type + name, user,
  timestamp, description
- Expandable: shows old values vs new values (JSON diff)
- Create: `#5F8F6B` | Update: `#7A7A7A` | Delete: `#9B3E3E`
- Timeline line: `#2C2C2C`

**AuditFilters.tsx:**
- Action type (create/update/delete)
- Entity type
- User
- Date range
- Glass styled, collapsible

**useAuditTrail.ts:**
- Hooks for: list audits (paginated), by entity, by user, stats

---

### REPORTS MODULE

10. `NavDashboard/frontend/src/modules/reports/pages/ReportsPage.tsx`
11. `NavDashboard/frontend/src/modules/reports/components/ReportBuilder.tsx`
12. `NavDashboard/frontend/src/modules/reports/components/ReportPreview.tsx`
13. `NavDashboard/frontend/src/modules/reports/hooks/useReports.ts`

**ReportsPage.tsx:**
- Template gallery: predefined report types as glass cards
  (Device Inventory, Error Summary, Location History, Full System)
- Custom report builder
- Generated reports list with download links

**ReportBuilder.tsx:**
- Select report type
- Configure parameters (date range, entities, filters)
- Format (PDF / Excel)
- "Generate" button (GlassButton)
- Preview before download (ReportPreview)

**ReportPreview.tsx:**
- In-browser preview of report data (table format)
- "Download PDF" / "Download Excel" buttons

**useReports.ts:**
- Hooks for: generate report, list templates, download

---

## OUTPUT FORMAT

Return EVERY file for ALL modules above with full path headers
and complete contents.

# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 27c: FRONTEND — SETTINGS + AUTH
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents for the following 2 modules.

---

### SETTINGS MODULE

1. `NavDashboard/frontend/src/modules/settings/pages/SettingsPage.tsx`
2. `NavDashboard/frontend/src/modules/settings/components/GeneralSettings.tsx`
3. `NavDashboard/frontend/src/modules/settings/components/UserManagement.tsx`
4. `NavDashboard/frontend/src/modules/settings/hooks/useSettings.ts`

**SettingsPage.tsx:**
- Tabs: General, User Management
- Glass tabbed interface

**GeneralSettings.tsx:**
- AI model selection (dropdown of available Ollama models)
- Ollama connection URL
- Default map center coordinates
- System info: version, DB size, document count
- Glass card sections

**UserManagement.tsx:**
- User list table (admin only)
- Create user button
- Edit role, activate/deactivate
- User form in GlassModal
- Role badges: Admin `#8C8C8C`, Technician `#6F7A8C`, Viewer `#6E6E6E`

**useSettings.ts:**
- Hooks for: get settings, update settings, list Ollama models

---

### AUTH MODULE

5. `NavDashboard/frontend/src/modules/auth/pages/LoginPage.tsx`
6. `NavDashboard/frontend/src/modules/auth/components/LoginForm.tsx`
7. `NavDashboard/frontend/src/modules/auth/hooks/useAuth.ts`

**LoginPage.tsx:**
- Centered login card (glass styled) on dark background `#0A0A0A`
- "NavDashboard" logo/name at top with subtle glow
- LoginForm below
- No sidebar/header — standalone page

**LoginForm.tsx:**
- Email input (GlassInput)
- Password input (GlassInput)
- "Login" button (GlassButton primary)
- Error message display
- Loading state

**useAuth.ts (module-level):**
- `useLogin()` → mutation, stores JWT in localStorage, updates authStore
- `useLogout()` → clears token, redirects to login, clears authStore
- `useCurrentUser()` → fetch current user from /api/v1/auth/me
- Integrates with authStore (Zustand) from shared/stores/authStore.ts

---

## OUTPUT FORMAT

Return EVERY file for BOTH modules above with full path headers
and complete contents.
# ═══════════════════════════════════════════════════════════════
# NAVDASHBOARD — CONTAINER PROMPT 28: INTEGRATION VALIDATION
# Stitch AFTER the Common Project Context prompt
# ═══════════════════════════════════════════════════════════════

## YOUR TASK

Generate complete contents of:

1. `NavDashboard/scripts/validate_structure.py`
2. `NavDashboard/scripts/check_imports.py`
3. `NavDashboard/backend/tests/__init__.py`
4. `NavDashboard/backend/tests/test_health.py`
5. `NavDashboard/backend/tests/test_assembly.py`
6. `NavDashboard/backend/tests/conftest.py`

---

## validate_structure.py

A cross-platform Python script that:
1. Reads the expected directory structure (hardcoded list of ALL
   expected files from the project)
2. Walks the NavDashboard directory
3. Reports:
   - ✅ Files that exist and are non-empty
   - ⚠️ Files that exist but are empty (0 bytes)
   - ❌ Files that are missing
4. Summary: X/Y files present, Z empty, W missing
5. Exit code 0 if all present and non-empty, 1 otherwise

---

## check_imports.py

A Python script that:
1. Scans all `.py` files in `backend/`
2. Extracts all `import` and `from ... import` statements
3. Checks if the imported module/file exists in the project
4. Reports broken imports
5. Scans all `.ts` and `.tsx` files in `frontend/src/`
6. Extracts all `import ... from '...'` statements
7. Checks if the referenced files exist (resolving `@/` alias)
8. Reports broken imports
9. Exit code 0 if no broken imports, 1 otherwise

---

## test_health.py

- Test that FastAPI app starts without errors
- Test `/api/v1/health` returns 200
- Test CORS headers are present

---

## test_assembly.py

- Import every module's models.py → verify no import errors
- Import every module's router.py → verify no import errors
- Import every module's service.py → verify no import errors
- Import core.config → verify settings load
- Import core.database → verify Base class exists with correct fields
- Import shared.pagination → verify PaginatedResponse exists
- Import shared.audit → verify record_audit exists

---

## conftest.py

- Pytest fixtures:
  - `app`: FastAPI test app
  - `client`: AsyncClient (httpx)
  - `db_session`: test database session (use SQLite or test PostgreSQL)
  - `auth_headers`: headers with valid JWT for test user

---

## OUTPUT FORMAT

Return every file with full path header and complete contents.


this is remaining prompts i made the project with best in class sota models but still the project had a critical but that can not be fixed easily the bug was that frontend and backend could not communicate properly and each and every file had that issue i made the project in 1 shot and tried the project first time when it ocmpleted and then there was endless time spent debugging but i dont want that now 

you now have a simple job we will make this project iteratively means divide it in parts complete each part at a time and see if it works you just have to write the prompts that will write the code 

tell me if you understand and ask any questions if you have dont start writing prompt yet 