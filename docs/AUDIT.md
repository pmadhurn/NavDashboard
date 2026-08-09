# NavOS — Phase 1 Audit

**Date:** 2026-08-10
**Method:** read from the repository at `/home/ubuntu/NavDashboard` and verified against the **running production stack** (`navdashboard-backend-1`, `navdashboard-db-1`, live at `https://nav.madhur.dev`). Every status claim below is backed by one of: the live OpenAPI schema (168 paths), a live `psql` query, `alembic current/heads`, or a direct read of the file cited. Nothing is inferred from filenames.

---

## 0. Read this first — the brief's premise is out of date

The brief opens: *"Today it is device-centric… We are expanding it into a full operations platform: Projects, Inventory, Finance, Attendance, Daily Updates, Downloads, an AI assistant, and an Admin engine… The current sidebar cannot carry this."*

**That describes an older snapshot of this codebase.** A prior expansion pass — committed 2026-07-10 under its own "phase 0–6" naming, unrelated to the brief's phase numbers — already shipped most of Phases 2, 3, 4 and 7:

| Brief asks for | Status in this repo |
|---|---|
| Phase 2 — top-level module nav + contextual sidebar | **Built.** `shared/components/WorkspaceRail.tsx` (icon rail, 5 workspaces) + `Sidebar.tsx` (contextual, per-workspace) driven by `shared/config/workspaces.tsx` |
| Phase 2 — reusable WhatsApp share | **Built.** `shared/components/ShareButton.tsx`, consumed by 12 pages |
| Phase 2 — landing page reflecting the whole platform | **Built.** `DashboardPage` renders permission-filtered widgets over `GET /dashboard/home` (devices, projects, deployed assets, expenses, pending users) |
| Phase 3 — Inventory + Projects, coupled | **Built.** `assets` + `projects` modules, 39 endpoints, device↔asset mirroring via `POST /assets/backfill-devices` |
| Phase 3 — outward form with conflict reconciliation | **Built.** `POST /projects/{id}/outward/preview` flags `NEW_ITEM`/`INSUFFICIENT`; `POST /projects/{id}/outward` refuses unconfirmed over-issue (400) and reconciles stock upward on confirm |
| Phase 3 — time-bound team membership | **Built.** `project_members.joined_at` / `left_at`, plus `POST /members/{id}/move` |
| Phase 3 — desktop→physical continuation on one project | **Built.** `project_phases` with `phase_type` = `DESKTOP_SURVEY \| PHYSICAL_SURVEY \| INSTALLATION \| MAINTENANCE \| OTHER`, each with its own lead |
| Phase 4 — Finance (categories, advances, dual entry, receipts, two dashboards) | **Built.** 23 endpoints; categories are exactly the eight named in the brief |
| Phase 7 — Downloads separate from project documents | **Built.** `download_*` tables are wholly separate from `documents` |
| Phase 7 — export engine (PDF/Excel, ±receipts, per user/project/range) | **Half built.** Exists and works — but only for Finance, and it lives inside `finance/service.py`, not a shared service |
| Phase 5 — Attendance | **Not started.** Zero references anywhere in the codebase |
| Phase 6 — Daily updates + leadership view | **Not started.** Zero references |

**So the highest-value work is not "build the platform". It is: (a) close the four genuinely-missing areas, and (b) fix the authorization split described in §3, which is a live security defect affecting 11 of 23 backend modules.**

Questions this raises for you are batched in §6. They do not block the architecture proposal, which is written against what is actually here.

---

## 1. Route map

### 1.1 Frontend routes — `frontend/src/app/routes.tsx`

29 routes plus `/login`, all lazy-loaded below an eager `Layout` shell. `RequirePermission` is a **client-side** guard that redirects to `/` when the section check fails.

| Path | Component | Client guard | Backend it depends on |
|---|---|---|---|
| `/` | `DashboardPage` (265 ln) | none | `/dashboard/home`, `/dashboard/status-distribution`, `/device-type-breakdown`, `/error-trends`, `/pair-status` |
| `/devices` | `DeviceListPage` (189) | none | `/devices/`, `/devices/stats` |
| `/devices/:id` | `DeviceDetailPage` (270) | none | `/devices/{id}`, `/devices/{id}/status-history`, `/documents/by-entity` |
| `/couples` | `CoupleListPage` (209) | none | `/couples/` |
| `/couples/:id` | `CoupleDetailPage` (478) | none | `/couples/{id}`, `/inventory/by-couple/{id}`, `/troubleshooting/by-couple/{id}` |
| `/pairs` | `PairListPage` (195) | none | `/pairs/`, `/pairs/stats` |
| `/pairs/:id` | `PairDetailPage` (258) | none | `/pairs/{id}`, `/troubleshooting/by-pair/{id}` |
| `/map` | `MapViewPage` (197) | none | `/couples/map-data` |
| `/troubleshooting` | `TroubleshootingPage` (356) | none | `/troubleshooting/*` (14 endpoints) |
| `/comparison` | `ComparisonPage` (88) | none | `/comparison/devices\|couples\|pairs` |
| `/documents` | `DocumentsPage` (133) | none | `/documents/*` |
| `/location-history` | `LocationHistoryPage` (181) | none | `/locations/history`, `/couples/?size=200` |
| `/search` | `SearchPage` (147) | none | `/search/global`, `/search/suggestions` |
| `/downloads` | `DownloadsPage` (308) | `downloads:VIEW` | `/downloads/*` |
| `/inventory/assets` | `AssetListPage` (261) | `inventory:VIEW` | `/assets/`, `/assets/categories` |
| `/inventory/assets/:id` | `AssetDetailPage` (134) | `inventory:VIEW` | `/assets/{id}`, `/assets/{id}/history` |
| `/inventory/deployed` | `DeployedPage` (112) | `inventory:VIEW` | `/assets/deployed` |
| `/projects` | `ProjectListPage` (249) | `projects:VIEW` | `/projects/` |
| `/projects/:id` | `ProjectDetailPage` (867) | `projects:VIEW` | 18 of the 24 `/projects/*` endpoints |
| `/finance` | `FinancePage` (493) | `finance:VIEW` | `/finance/`, `/finance/summary` |
| `/finance/my` | `MyFinancePage` (197) | `finance:VIEW` | `/finance/my`, `/finance/balance/{id}` |
| `/finance/claims` | `ClaimsPage` (197) | `finance:VIEW` | `/finance/claims` |
| `/finance/settlement` | `SettlementPage` (213) | `finance:MANAGE` | `/finance/settlement`, `/finance/claims/{id}/settle` |
| `/personnel` | `PersonnelListPage` (198) | `personnel:VIEW` | `/personnel/*` |
| `/audit` | `AuditTrailPage` (288) | `admin:VIEW` | `/audit/*` |
| `/backup` | `BackupPage` (282) | `admin:VIEW` | `/backup/*` |
| `/reports` | `ReportsPage` (139) | `reports:VIEW` | `/reports/templates`, `/reports/generate` |
| `/ai` | `AIChatPage` (408) | `ai:VIEW` | `/ai/*` |
| `/settings` | `SettingsPage` (84) | `admin:VIEW` | `/settings/*`, `/auth/users*`, `/seeding/*` |
| `/login` | `LoginPage` (209) | public | `/auth/login`, `/auth/google`, `/auth/clerk*` |

**Dead / orphaned in the frontend:**
- `shared/components/PlaceholderPage.tsx` — **zero importers.** Dead code.
- `/search` is a live route but appears in **no workspace** in `workspaces.tsx`, so it is reachable only by typing the URL or via the header search box. Undiscoverable in nav.
- `shared/hooks/useDevices.ts` duplicates `modules/devices/hooks/` — verify before deleting.

### 1.2 Backend routes — 23 routers, 168 paths, 217 operations, all under `/api/v1`

Registered in `backend/main.py` (lines 112–134). **Two different counts are used throughout this document and they are not interchangeable:** the live OpenAPI schema exposes **168 distinct paths**, but many carry several verbs (`GET,PUT,DELETE /devices/{id}` is one path, three operations). Counted by verb there are **217 operations**. Authorization is per-operation, so §3 counts operations.

| Router | Operations |
|---|---:|
| `projects` | 24 |
| `finance` | 23 |
| `auth` | 17 |
| `assets` | 15 |
| `troubleshooting` | 14 |
| `inventory` (fitting materials) | 13 |
| `devices` | 10 |
| `personnel` | 10 |
| `backup` | 10 |
| `couples` | 9 |
| `downloads` | 9 |
| `documents` | 8 |
| `ai_assistant` | 8 |
| `pairs` | 7 |
| `dashboard` | 7 |
| `settings` | 7 |
| `locations` | 6 |
| `audit_trail` | 5 |
| `seeding` | 5 |
| `comparison` | 3 |
| `status` | 3 |
| `reports` | 2 |
| `search` | 2 |
| `health` (in `main.py`) | 1 |

Note the naming collision worth knowing before you touch either: **backend `inventory` ≠ frontend `inventory`.** Backend `/api/v1/inventory/*` is *fitting materials* (per-couple consumables, `fitting_materials` + `material_templates`), surfaced only inside `CoupleDetailPage` via `MaterialSelector`. The frontend `modules/inventory/` folder is the **assets** UI and calls `/api/v1/assets/*`. Two different inventory systems with overlapping purpose (flagged in the 7 Jul audit; still true).

---

## 2. Data model

**Verified live:** 44 tables in `public` (42 application tables + `alembic_version` + PostGIS `spatial_ref_sys`). **The live schema matches the SQLAlchemy models exactly — no drift.** Single Alembic head `d5e6f7a8b9c0`, and `alembic current` equals it. 24 migration files, no branched heads.

All models inherit `Base` (uuid PK, `created_at`, `updated_at`); most add `SoftDeleteMixin` (`deleted_at`) and several add `CustomFieldsMixin` (JSONB).

### 2.1 Tables by domain, with live row counts

| Domain | Table | Rows | Key columns / FKs |
|---|---|---|---|
| **Identity** | `users` | 2 | email, hashed_password, role, status(PENDING/ACTIVE), auth_provider |
| | `user_permissions` | **0** | user_id → users, section, level |
| | `personnel` | 5 | name, user_id → users (nullable link) |
| | `assignment_history` | 0 | person_id → personnel |
| **Devices** | `devices` | 10 | serial_number (partial unique), status, `couple_id` **(no FK constraint)** |
| | `device_status_history` | 0 | device_id |
| | `couples` | 4 | location_id → locations |
| | `pairs` | 2 | couple_a_id, couple_b_id |
| | `locations` | 4 | lat/lng |
| | `location_history` | 0 | couple_id |
| **Support** | `error_logs` | 5 | severity, device/couple/pair links |
| | `troubleshoot_entries` | 7 | error_id → error_logs |
| | `status_change_logs` | 0 | entity_type + entity_id (polymorphic) |
| **Projects** | `projects` | 3 | project_type (POC/DEMO/INSTALLATION/OTHER), status, customer, lat/lng, created_by |
| | `project_phases` | 9 | project_id, phase_type, lead_person_id, started_at/ended_at |
| | `project_members` | 3 | project_id, person_id, phase_id, **joined_at / left_at** |
| | `project_timeline_entries` | 0 | append-only; entry_type, metadata_json |
| | `project_deployments` | 0 | entity_type + entity_id (device/couple/pair/asset), deployed_at/removed_at |
| | `equipment_movements` | 0 | project_id, phase_id, direction (OUTWARD/INWARD), handled_by |
| | `equipment_movement_items` | 0 | movement_id, asset_id, quantity, item_status (RETURNED/WITH_CLIENT/DAMAGED/LOST) |
| **Assets** | `assets` | 4 | asset_code (unique), item_kind (SERIALIZED/BULK), quantity, **status (IN_OFFICE/…)**, current_project_id, current_person_id, device_id, tag_identifiers JSONB |
| | `asset_categories` | 3 | self-referential parent_id |
| | `asset_history` | 0 | asset_id |
| | `asset_reports` | 0 | — |
| **Fitting materials** | `fitting_materials` | 2 | couple-scoped |
| | `material_templates` | 0 | — |
| **Finance** | `expenses` | 5 | amount Numeric(14,2), category, project_id, batch_id, claim_id, status, paid_by/paid_at |
| | `expense_members` | 0 | expense_id, person_id (bill splitting) |
| | `expense_batches` | 1 | grouping |
| | `expense_claims` | 1 | project_id, submitted_by, status, settled_by/at |
| | `fund_allocations` | 2 | **advances** — person_id, project_id, amount, received_date |
| **Downloads** | `download_categories` / `download_items` / `download_versions` / `download_item_access` | 0 / 0 / 0 / 0 | per-item and per-category access grants |
| **Documents** | `documents` | 0 | polymorphic entity_type + entity_id, MinIO path, share tokens |
| **Platform** | `audit_logs` | 47 | — |
| | `system_settings` | 6 | includes `ollama_model` (overrides `.env`) |
| | `seed_records` | 63 | demo-data registry |
| | `chat_sessions` / `chat_messages` | 20 / 48 | AI |
| | `embedding_documents` | 47 | pgvector `Vector(768)` |

### 2.2 Flags

1. **`user_permissions` is empty.** Both users are ADMIN, so every permission check short-circuits via `full_access_map()`. **The entire section/level permission system has never executed against a non-admin user in this database.** Any claim that permissions "work" is untested.
2. **Seven project/asset tables have zero rows** — `project_deployments`, `project_timeline_entries`, `equipment_movements`, `equipment_movement_items`, `asset_history`, `asset_reports`, `expense_members`. The endpoints exist and the seeder doesn't populate them, so these paths are code-verified but not data-verified.
3. **Missing FK constraints.** `devices.couple_id`, `assets.device_id`, `assets.current_project_id`, `project_members.phase_id`, `equipment_movements.phase_id`, and every `created_by`/`added_by`/`logged_by` user reference are plain UUID columns with no FK. Orphan rows are possible today.
4. **Polymorphic references are unconstrained by design** — `documents`, `project_deployments`, `status_change_logs`, `audit_logs` all use `entity_type` + `entity_id`. Workable, but nothing prevents a dangling pointer.
5. **`backup` covers 27 of 42 tables.** `modules/backup/exporter.py` omits, among others: **`user_permissions`, `download_*` (all four), `equipment_movements`, `equipment_movement_items`, `device_status_history`, `assignment_history`**. A restore from a NavOS CSV/XLSX archive silently loses every permission grant, the whole Downloads archive, and all equipment movement history. (`chat_*`, `embedding_documents`, `seed_records`, `system_settings` are reasonably excluded; the six above are not.)

---

## 3. Auth & permissions — the most important finding

### 3.1 What exists

**Authentication** (`core/dependencies.py`, `modules/auth/`): three providers converge on one app-issued JWT — email/password, Google (`/auth/google`), and Clerk (`/auth/clerk`, identity-only, JWKS-cached with a forced-refetch cooldown). `get_current_user` rejects deleted, disabled and `PENDING` users. Unknown federated emails are created **PENDING**, never auto-admitted. This part is sound.

**Authorization** — there are **two parallel, unreconciled systems**:

| System | Mechanism | Where |
|---|---|---|
| **A. Section × level** (the modern one) | `require_permission(section, level)` → `user_permissions` rows, or `ROLE_DEFAULT_PERMISSIONS` fallback, or `full_access_map()` for ADMIN. 11 sections × 4 levels (`NONE < VIEW < EDIT < MANAGE`) | `core/permissions.py`, `core/dependencies.py` |
| **B. Hardcoded role strings** (the legacy one) | `require_role("ADMIN", "TECHNICIAN")` — compares `user.role` to a literal list, ignores `user_permissions` entirely | scattered across 11 routers |

### 3.2 Coverage, measured per router

**Denominator: 217 operations** (see §1.2). Of those, **79 are guarded by `require_permission`**, **46 by `require_role`**, **87 by nothing but `Depends(get_current_user)`**, and the remaining 5 are deliberately public (`/auth/login`, `/auth/register`, `/auth/google`, `/auth/clerk*`, `/health`).

| Router | Operations | `require_permission` | `require_role` | logged-in only |
|---|---:|---:|---:|---:|
| projects | 24 | **24** | 0 | 0 |
| finance | 23 | **23** | 0 | 0 |
| assets | 15 | **15** | 0 | 0 |
| downloads | 9 | **9** | 0 | 0 |
| ai_assistant | 8 | **8** (via `ai_view`/`ai_manage` aliases) | 0 | 0 |
| auth | 17 | 0 | 9 | 4 |
| troubleshooting | 14 | 0 | 1 | 13 |
| inventory | 13 | 0 | 1 | 12 |
| devices | 10 | 0 | 5 | 5 |
| personnel | 10 | 0 | 6 | 4 |
| backup | 10 | 0 | 4 | 6 |
| couples | 9 | 0 | 5 | 4 |
| pairs | 7 | 0 | 4 | 3 |
| settings | 7 | 0 | 5 | 2 |
| audit_trail | 5 | 0 | 1 | 4 |
| seeding | 5 | 0 | 5 | 0 |
| **documents** | **8** | **0** | **0** | **7** |
| **dashboard** | **7** | **0** | **0** | **7** |
| **locations** | **6** | **0** | **0** | **6** |
| **comparison** | **3** | **0** | **0** | **3** |
| **status** | **3** | **0** | **0** | **3** |
| **reports** | **2** | **0** | **0** | **2** |
| **search** | **2** | **0** | **0** | **2** |

### 3.3 What that means, concretely

- **79 of 217 operations** (the five new modules) enforce the section model server-side. **138 do not.**
- **Seven routers carry no authorization whatsoever — 31 operations**: `documents` (8, including `POST /documents/upload`, `DELETE /documents/{id}`, `POST /documents/{id}/share-link`), `dashboard` (7), `locations` (6, including writes), `comparison` (3), `status` (3, including `POST /status/change`), `reports` (2), `search` (2).
- **Across all 23 routers, 87 operations are reachable by any authenticated user** — the seven above plus the unguarded remainder of routers that guard only *some* of their endpoints: `troubleshooting` 13 of 14, `inventory` 12 of 13, `backup` 6 of 10, `devices` 5 of 10, `couples` 4 of 9, `auth` 4, `audit_trail` 4 of 5, `personnel` 4 of 10, `settings` 2 of 7, `pairs` 3 of 7. **A VIEWER can read and, in several cases, write across most of the platform.**
- **The UI gates routes the API does not gate.** `/reports` is hidden behind `reports:VIEW` in the client; `GET /reports/templates` and `POST /reports/generate` accept any authenticated user. `documents` is worse in a different way: its `section: 'documents'` is honoured for **sidebar visibility only** (`visibleItems()` in `workspaces.tsx`) — the `/documents` route itself has **no** `RequirePermission` wrapper, so hiding the link hides nothing, and none of the 8 API operations check anything.
- **The two systems contradict each other.** Grant a user `personnel: MANAGE` in the permission matrix while their `role` stays `VIEWER`: the Personnel item appears in their sidebar (client checks the matrix), the list loads (bare `get_current_user`), and every write returns 403 (`require_role("ADMIN","TECHNICIAN")` ignores the matrix). The Admin screen therefore hands out permissions that do not do what they say.
- The brief's acceptance criterion *"Permissions enforced server-side, not just hidden in the UI"* and *"no hardcoded role checks scattered in components"* is **currently satisfied for 5 of 23 modules.**

### 3.4 Can the model support per-feature, per-role access?

Yes — the `user_permissions` (user × section × level) table plus `require_permission` is the right shape and needs no redesign. Three things are missing:
1. **Coverage** — apply it to the other 18 routers and delete `require_role`.
2. **Ownership scoping.** Section×level answers *"may this user touch Finance?"* but not *"may this user touch **someone else's** expense?"* Today `GET /finance/my` scopes by caller, but `PUT /finance/{expense_id}` at `EDIT` lets any finance-EDIT user edit anyone's line. Attendance and Daily Updates make this unavoidable — you need a `SELF | TEAM | ALL` scope dimension.
3. **Roles as permission presets.** `ROLE_DEFAULT_PERMISSIONS` is a hardcoded dict for TECHNICIAN/VIEWER only. Admin cannot define a role.

---

## 4. Shared primitives

### 4.1 Reusable — build on these

| Primitive | File | Notes |
|---|---|---|
| Layout shell | `shared/components/Layout.tsx` (249) | Rail + sidebar desktop; `Drawer` on mobile via `useIsMobile()` |
| Workspace switcher | `shared/components/WorkspaceRail.tsx` | 5 workspaces, permission-filtered |
| Contextual sidebar | `shared/components/Sidebar.tsx` | Renders `visibleItems(workspace, user)` |
| **Nav registry** | `shared/config/workspaces.tsx` | Single source of truth: workspace → items → `section` + `level`. Adding a module = one array entry |
| Glass component set | `GlassButton`, `GlassCard`, `GlassInput`, `GlassModal` | The de-facto component library |
| Data table | `DataTable.tsx` | antd Table wrapper; `scroll={{x:'max-content'}}` when mobile |
| Page chrome | `PageHeader.tsx` | Wraps at narrow widths (fixed 2026-08-09) |
| Others | `StatusBadge`, `EmptyState`, `ConfirmDialog`, `LoadingSpinner`, `ErrorBoundary`, `PersonPicker`, `ThemeToggle` | |
| **WhatsApp share** | `ShareButton.tsx` | `buildWhatsAppUrl()` + button. Used by 12 pages |
| Design tokens | `styles/global.css` (CSS custom properties, light + dark), `styles/theme.ts`, `shared/utils/colors.ts` | Severity ramp validated for CVD separation |
| API client | `shared/api/client.ts` | axios, `baseURL: /api/v1`, bearer injection, 401 → logout except on sign-in endpoints |
| State | zustand: `authStore` (+ `hasPermission`), `uiStore` (sidebar, active workspace), `themeStore` | |
| Server state | TanStack Query per module (`modules/*/hooks/use*.ts`) | Consistent pattern |
| Backend shared | `shared/pagination.py`, `shared/filters.py`, `shared/audit.py`, `shared/propagation.py`, `core/dependencies.py` | |

### 4.2 Duplicated or inconsistent — consolidate before adding modules

1. **Two authorization systems** (§3) — the big one.
2. **Two inventory models** — `fitting_materials` (couple-scoped) vs `assets` (global). Different shapes, overlapping intent.
3. **Two seed systems** — `shared/seed.py` and per-service `seed_*` methods (`/devices/seed`, `/couples/seed`, `/pairs/seed`, `/inventory/seed`, `/personnel/seed`, `/troubleshooting/seed`) — plus the newer `modules/seeding/` registry. Three, arguably.
4. **Inline `style={{}}` everywhere.** Layout, Sidebar, WorkspaceRail and most pages style inline rather than via tokens/classes. There is a token system; it is inconsistently used. The brief's "no bespoke styling" rule is not met today.
5. **Pagination caps live in two places** — the route's `Query(..., le=)` *and* `shared/pagination.py::PaginationParams`. Changing one alone converts a 422 into a 500. Both currently 500.
6. **`register_exception_handlers()`** in `core/exceptions.py` is defined and **never called**; `main.py` registers the same five handlers inline. Dead code.
7. **Redis** runs as a container and is referenced only by `REDIS_URL` in config. Nothing uses it.
8. **Lazy in-function imports** are pervasive (`from modules.X import Y` inside function bodies) to dodge circular imports between projects ↔ assets ↔ finance ↔ troubleshooting.
9. **`PlaceholderPage.tsx`** — dead. **`parse_csv.py`**, **`qa_bot/crawler.py`** — orphaned root-level scripts.

---

## 5. Gap list

Legend: ✅ built & verified · 🟡 partial · ❌ absent

### 5.1 Against the original device-management spec

| Item | Status | Evidence |
|---|---|---|
| Device CRUD, status, serial lookup, status history | ✅ | 10 endpoints; `device_status_history` **0 rows** — history is written on status change but nothing in the DB has exercised it |
| Couples, pairs, map, location history | ✅ | `location_history` **0 rows** — the Location History page reads an empty table today |
| Troubleshooting: error logs, steps, resolve, by-device/couple/pair | ✅ | 14 endpoints, 5+7 rows |
| Comparison (devices/couples/pairs) | ✅ | 3 endpoints |
| Reports | 🟡 | Only 2 endpoints (`templates`, `generate`); no permission check server-side |
| **Couple column shows raw truncated UUIDs** in every device table | ❌ | Known, deferred 2026-08-09: needs the API to return a human-readable couple label |
| **Device-specific AI retrieval** | 🟡 | 47 docs indexed and asset/error-log/troubleshooting queries answer correctly, but *"list the indoor units with serial and status"* gets a refusal. Top-k relevance problem in `ai_assistant/retriever.py` |
| Search | 🟡 | Works, but in **no workspace** — undiscoverable; and no authorization |
| Audit trail | ✅ | 47 rows; revert is ADMIN-only |
| Backup/restore | 🟡 | Covers 27 of 42 tables (§2.2 #5) |
| Notifications of any kind | ❌ | None. No alerts for critical errors, pending approvals, overdue returns |

### 5.2 Against this brief, phase by phase

**Phase 2 — nav shell & design system**
| Requirement | Status |
|---|---|
| Top-level module nav + contextual sidebar | ✅ Rail + contextual Sidebar |
| Mobile first-class (drawer, thumb reach, tables→cards) | 🟡 Drawer + workspace chips + horizontally-scrolling tables exist. **No bottom nav; tables scroll, they do not degrade to cards.** Primary actions sit in `PageHeader`, top of screen, not thumb-reachable |
| One consolidated design system, no one-off styling | 🟡 Tokens + Glass set exist; inline styling is pervasive (§4.2 #4) |
| Device module ported unchanged | ✅ |
| Reusable WhatsApp share | ✅ 12 consumers |
| Landing page reflects whole platform | ✅ |

**Phase 3 — Inventory & Projects**
| Requirement | Status |
|---|---|
| Master stock list, adding a Device creates/links its inventory record | ✅ `assets.device_id` + `POST /assets/backfill-devices` |
| Three states: in-office / deployed / with a person | ✅ `assets.status` + `current_project_id` + `current_person_id`; `GET /assets/deployed` |
| Owner sees who holds what, for which project, since when | ✅ `DeployedPage` + `asset_history` (**0 rows — never exercised**) |
| Desktop survey vs physical survey as distinct flows | ❌ **Modelled, not implemented.** `project_phases.phase_type` distinguishes them and `project_type` is still POC/DEMO/INSTALLATION/OTHER. But `ProjectDetailPage.tsx:850–856` renders **all five tabs — Timeline, Phases, Equipment, Deployed, Team — unconditionally**; the only reference to `project_type` in the whole page is a subtitle string (line 811), and `phase_type` is used only to label rows in the Phases tab. A desktop survey therefore shows the outward/inward Equipment tab and the site-team Team tab, which the brief says it must not. The data model permits the distinction; no code makes it |
| Desktop → physical continuation on the same project, new person, new stage | ✅ `POST /projects/{id}/phases` + `phase.lead_person_id` + timeline entry |
| Key documents, photos, team, equipment on a project | ✅ documents (polymorphic) + members + movements |
| Time-bound membership (join, leave mid-project, release at close) | ✅ `joined_at`/`left_at`, `POST /members/{id}/move`, `POST /projects/{id}/close` marks departing members |
| Outward: type-ahead from inventory | ✅ `GET /assets/lookup/{code}` |
| Outward: add unknown item inline, never block | ✅ `NEW_ITEM` conflict creates the asset on confirm |
| Outward: over-issue warn + show discrepancy + proceed + audit entry | ✅ `preview` returns `INSUFFICIENT` with available qty; `execute` refuses without `confirm`, then reconciles upward |
| Survives negative stock, duplicate names, partial returns, returns to a different project, never-returned | 🟡 **Unverified.** `item_status` (RETURNED/WITH_CLIENT/DAMAGED/LOST) models partial return and never-returned; nothing enforces asset-name uniqueness (`assets.name` is not unique — only `asset_code` is), and no test or data exercises any of it (`equipment_movements` = 0 rows) |

**Phase 4 — Finance**
| Requirement | Status |
|---|---|
| Categories incl. user-defined "other" | ✅ `EXPENSE_CATEGORIES` = Hotel, Food, Air travel, Cab, Rickshaw, Bus, Train, Other |
| Lead logs on behalf of the team; concurrent logging per project | ✅ `expense_members` + `added_by` (0 rows — untested) |
| Advances issued, drawn down, balance visible to user and finance | ✅ `fund_allocations` + `GET /finance/balance/{person_id}` + `/finance/my` |
| Two entry paths (in-app + spreadsheet) rolling into one total | ✅ `POST /finance/import` (csv/xlsx via openpyxl) feeds the same `expenses` table |
| Receipt images on expense lines | ✅ via `documents` |
| User dashboard (own expenses/advances/status) | ✅ `MyFinancePage` |
| Finance dashboard (all users, project- and person-wise, pending queue, flag paid/query, filters, totals) | ✅ `FinancePage` + `SettlementPage` + `/finance/summary` |
| Finance as a permission set, not a user type | ✅ **already true** — `finance` is a section; `finance:MANAGE` gates settlement |

**Phase 5 — Attendance:** ❌ **Nothing.** No table, model, router, page, or nav item. `grep -ri "attendance\|comp_off" backend frontend/src` → zero hits. Also absent from `SECTIONS`.

**Phase 6 — Daily updates & leadership view:** ❌ **Nothing.** No table, model, router, page. No commenting infrastructure anywhere in the codebase. No leadership role or view.

**Phase 7 — Downloads & Admin**
| Requirement | Status |
|---|---|
| Standalone archive, separate from project documents | ✅ `download_*` tables entirely separate from `documents`; separate router, separate page. **0 rows — never used in anger** |
| Per-item / per-category access gating | ✅ `download_item_access` + `require_permission("downloads", …)` on all 9 endpoints |
| Export: PDF + Excel, ±receipt images, per user/project/date range | 🟡 **Finance only.** `GET /finance/export?format=pdf\|xlsx\|zip&scope=all\|project\|user\|claim&date_from&date_to&include_images` — works, verified by smoke script. **Projects has no export at all** |
| One shared export service consumed by all modules | ❌ It lives in `finance/service.py` (~270 lines of reportlab/xlsxwriter/zip). `modules/reports/` is a separate, unrelated generator |
| Admin: manage users, roles, per-module feature access | 🟡 `GET/PUT /auth/users/{id}/permissions` + Settings UI exist. But roles are a fixed enum with a hardcoded default map, and §3 means the grants are only honoured by 5 of 23 modules |
| No hardcoded role checks | ❌ 46 `Depends(require_role(...))` call sites across 11 routers |

### 5.3 Cross-cutting defects found during this audit

| # | Severity | Finding |
|---|---|---|
| 1 | **High** | 87 of 217 operations have zero authorization beyond authentication — seven routers (31 operations) carry none at all, including document upload/delete/share-link, report generation and `POST /status/change` (§3.3) |
| 2 | **High** | Two contradictory authorization systems; admin-granted permissions are inert for 18 of 23 routers (§3) |
| 3 | **High** | Backup omits 15 tables including `user_permissions`, all four `download_*`, and both `equipment_movement*` (§2.2 #5) |
| 4 | **High** | **The working tree is the half-migrated state the brief forbids**: 133 modified files, 13 untracked (including `modules/seeding/`, `clerk.py`, `docker-compose.prod.yml`, one migration `d5e6f7a8b9c0`), one staged deletion (`backend/.env`), nothing committed since 2026-07-10. Everything from the 2026-08-09 session is uncommitted. **`frontend/.env` is still tracked.** |
| 5 | Medium | `user_permissions` is empty and both users are ADMIN — the permission system has never run a non-trivial path in this DB |
| 6 | Medium | Zero automated tests. Verification is six bash smoke scripts (`scripts/*.sh`) that hardcode `localhost:8080` (actual: `8085`) and the **rotated** `admin123` password, so **none of them currently run**. They also POST live records ("Smoke Test Cable") into the production DB |
| 7 | Medium | The 2026-08-09 browser sweep covered 22–23 routes; `routes.tsx` declares 29. Its defect table names only device-era routes, so `/projects`, `/finance/*`, `/inventory/*`, `/downloads` have **not** been verified in a browser at either width or theme |
| 8 | Medium | Missing FK constraints on ~10 relationships (§2.2 #3) |
| 9 | Low | `PlaceholderPage.tsx`, `register_exception_handlers()`, Redis, `parse_csv.py`, `qa_bot/crawler.py` — all dead or unused |
| 10 | Low | `/search` in no workspace; `documents` section declared in nav but checked nowhere |
| 11 | Low (open from 2026-08-09) | All 63 rows are registered as demo data → "Remove demo data" would empty every seedable table. No Cloudflare Access in front of the hostname. Old tunnel token in git history still unrevoked |

---

## 6. Questions — batched, per your ground rules

1. **Was this brief written against an older snapshot?** Phase 2's nav model, Phase 3's outward/conflict engine, and Phase 4's finance module are already in the repo. I have written `ARCHITECTURE.md` to **extend** them rather than rebuild — confirm that's what you want, or tell me what specifically is wrong with what's there.
2. **Are the existing projects/inventory/finance/downloads modules "working modules" (extend, don't rewrite) or a draft to be superseded?** They are code-complete and API-verified but have near-zero production data and were never browser-tested. This is the single answer that most changes downstream work.
3. **Confirm the genuinely-new scope is: Attendance, Daily Updates + leadership home, a shared export service, and full permission-model coverage.** Anything else you consider missing that I have marked ✅?
4. **Project type vs project phase.** The brief describes "desktop survey" and "physical survey" as *project types*; the code models them as *phases* on a project (which is what makes the "continue into physical survey on the same project" requirement work cleanly). Keep the phase model and drop `project_type`'s POC/DEMO/INSTALLATION values, or keep both?
5. **Permission scope dimension.** Attendance and Daily Updates need "own vs team vs all" (a lead approves their team's attendance; a viewer sees only their own). I propose adding a `scope` column to `user_permissions`. Confirm, or tell me you'd rather keep it flat and handle scoping in service code.
6. **The uncommitted tree.** 133 modified files, nothing committed for a month. I have not committed anything. Do you want a commit of the current working state before Phase 2 starts, so there is a rollback point?

---

## 7. What I did not do

- No feature code written, no files modified outside `docs/`.
- Nothing committed, nothing staged. `git status` is exactly as I found it.
- Did not run the smoke scripts — they write records into the live production database and their credentials are stale.
- Did not browser-test the untested routes (item 5.3 #7); that needs a working admin credential and belongs at the start of Phase 2 as the regression baseline.
