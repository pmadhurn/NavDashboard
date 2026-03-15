# NAVDASHBOARD — PHASE 6 TECHNICAL REPORT

## Summary

Phase 6 introduced the Couples and Locations modules across the full stack. Couples are the core organizational entity that groups devices, materials, personnel, and geographic locations together. Location history tracking with configuration snapshots was implemented to satisfy Business Rule #8.

---

## Files Created/Modified

| Category | Files | Action |
|----------|-------|--------|
| Backend — Locations module | `__init__.py`, `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` | **Created** (6) |
| Backend — Couples module | `__init__.py`, `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` | **Created** (6) |
| Backend — Core | `main.py`, `migrations/env.py` | **Replaced** (2) |
| Frontend — Types | `locations.ts`, `couples.ts` | **Created** (2) |
| Frontend — Couples module | `useCouples.ts`, `CoupleListPage.tsx`, `CoupleDetailPage.tsx`, `CoupleCard.tsx`, `CoupleTable.tsx`, `CoupleForm.tsx`, `MaterialSelector.tsx` | **Created** (7) |
| Frontend — Routes | `routes.tsx` | **Replaced** (1) |
| **Total** | **24 files** | 21 created, 3 replaced |

---

## Database State

### New Tables

| Table | Columns | Notes |
|-------|---------|-------|
| `locations` | id, latitude, longitude, coordinate (PostGIS POINT), address_note, created_at, updated_at, deleted_at | Geometry column uses GeoAlchemy2 `Column()` syntax |
| `location_history` | id, couple_id, old_latitude, old_longitude, new_latitude, new_longitude, moved_at, handled_by, had_rf, distance_meters, fitting_materials_snapshot (JSONB), configuration_snapshot (JSONB), notes, custom_fields | Tracks every location change with full snapshots |
| `couples` | id, name, pair_id, has_rf, status, handling_person_id (FK→personnel), location_id (FK→locations), configuration (JSONB), notes, custom_fields, created_at, updated_at, deleted_at | Core entity linking devices, materials, locations, personnel |

### FK Constraints

| Constraint | Status |
|------------|--------|
| `couples.handling_person_id → personnel.id` | ✅ Active |
| `couples.location_id → locations.id` | ✅ Active |
| `devices.couple_id → couples.id` | ⏳ Deferred (plain UUID, linked by application logic) |
| `fitting_materials.couple_id → couples.id` | ⏳ Deferred (plain UUID, linked by application logic) |

### Existing Tables (Unchanged)

`users`, `audit_logs`, `devices`, `device_status_history`, `personnel`, `assignment_history`, `fitting_materials`, `material_templates`, `alembic_version`

---

## API Surface — New Endpoints

### Locations (`/api/v1/locations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all locations |
| GET | `/history` | All location history (paginated, filterable by couple_id) |
| GET | `/history/{couple_id}` | Location history for specific couple |
| GET | `/{id}` | Single location |
| POST | `/` | Create location |
| PUT | `/{id}` | Update location |

### Couples (`/api/v1/couples`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List couples (paginated, filterable by status, has_rf, pair_id, name) |
| GET | `/map-data` | All couples with coordinates for map rendering |
| POST | `/` | Create couple (with inline devices, materials, location, template) |
| GET | `/{id}` | Full couple detail (nested devices, materials, location, person) |
| PUT | `/{id}` | Update couple |
| DELETE | `/{id}` | Soft delete couple (Business Rule #3) |
| PUT | `/{id}/location` | Change location (Business Rule #8, creates history) |
| GET | `/{id}/location-history` | Location history for this couple |
| POST | `/seed` | Seed sample couples (admin only) |

**Total new endpoints: 15** (6 locations + 9 couples)

---

## Business Rules Verified

| Rule | Description | Status | How Verified |
|------|-------------|--------|--------------|
| #1 | Device can only belong to one couple at a time | ✅ | `create_couple` auto-unassigns devices from old couple before assigning to new |
| #3 | Deleting couple nullifies devices' couple_id | ✅ | `delete_couple` sets `couple_id = NULL` on all assigned devices, removes pair_id |
| #8 | Location change creates history with snapshot | ✅ | `change_couple_location` creates `LocationHistory` record with old/new coords, distance (Haversine), materials snapshot, configuration snapshot, had_rf flag |

---

## Frontend Pages

### Couple List Page (`/couples`)

- **Card grid view** (default) — responsive 1-3 columns, glass cards with status accent border
- **Table view** — toggle button switches to DataTable with sortable columns
- **Filters** — status select, RF toggle switch, name search with debounce
- **Actions** — Add Couple, Seed Couples (admin only), view toggle
- **Pagination** — built into both views

### Couple Detail Page (`/couples/:id`)

- **Two-column layout** on wide screens
- **Left column**: Info card, Devices card (clickable → device detail), Materials card
- **Right column**: Location card, Configuration card, Custom Fields card, Location History card (scrollable timeline)
- **Actions**: Edit (modal), Delete (confirm dialog), Change Location (modal with lat/lng inputs)

### Components

| Component | Purpose |
|-----------|---------|
| `CoupleCard` | Glass card with name, status badge, device count, RF tag, person, coordinates |
| `CoupleTable` | DataTable with name, status, RF, devices count, person, location, updated, actions |
| `CoupleForm` | Modal form for create/edit — name, RF switch, status, person select, location inputs, device multi-select (create only), material selector, configuration JSON, notes, custom fields |
| `MaterialSelector` | Multi-row material input with autocomplete from `/inventory/suggestions`, template dropdown from `/inventory/templates` |

---

## Issues Encountered and Fixed

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `SyntaxError: 'await' outside function` | `service.py` was split across chat responses and didn't merge properly | Provided complete single file |
| `Can't locate revision '03a68ed6aec5'` | Alembic version table pointed to a deleted migration | `DELETE FROM alembic_version` + `alembic stamp head` |
| `UUID is not JSON serializable` | `record_audit` receives dict with UUID values for JSONB column | Added `_make_json_safe()` helper that converts UUIDs to strings |
| `GET /devices/?size=200` returns 422 | Devices router has `size` param capped at `le=100` | Changed `CoupleForm.tsx` to request `size=100` |
| `fitting_materials_snapshot` validation error | Schema defined as `Optional[dict]` but data is stored as `list[dict]` | Changed to `Optional[list[dict]]` in both backend schema and frontend type |
| GlassCard CSS warning (border vs borderLeft) | React warns about shorthand/non-shorthand CSS conflict | Cosmetic only — does not affect functionality |
| `destroyOnClose` deprecation warning | Ant Design v5.22 renamed to `destroyOnHidden` | Cosmetic only — does not affect functionality |

---

## Seed Data

After running all seeds (`devices/seed` → `personnel/seed` → `inventory/seed` → `couples/seed`):

| Entity | Count | Details |
|--------|-------|---------|
| Devices | 10 | IU×3, OU×3, HC×2, RF×2 |
| Personnel | 6 | Various roles |
| Material Templates | 2 | Standard Rooftop Kit, Indoor Minimal Kit |
| Couples | 4 | A1 (Working), A2 (Working+RF), B1 (Not Working), B2 (Faulty+RF) |
| Locations | 4 | Paris coordinates with address notes |

---

## Phase 7 Needs — What Pairs Module Will Use

| Dependency | Current State | Phase 7 Action |
|------------|--------------|----------------|
| `couples.pair_id` | Plain UUID column, nullable, no FK | Add FK → `pairs.id` when pairs table exists |
| Couple model | Has `pair_id` field ready | Pairs service will set `pair_id` on two couples to link them |
| Couple API | Returns `pair_id` in response | Pairs detail page will show linked couples |
| Map data endpoint | Returns all couples with coordinates | Pairs map view can show connected couples |
| Location history | Tracks per-couple | Pairs can aggregate history for both couples in a pair |
| `devices.couple_id` | Plain UUID, no FK to couples | Consider adding formal FK constraint in Phase 7 cleanup |
| `fitting_materials.couple_id` | Plain UUID, no FK to couples | Consider adding formal FK constraint in Phase 7 cleanup |
| Material copy/template system | Fully working | Pairs may want to sync materials between coupled pairs |

---

## Verified Test Results

```
✅ Couples list:     3 couples returned (1 deleted during testing)
✅ Map data:         3 map points with coordinates
✅ Health check:     status: ok, database: connected
✅ Device stats:     8 devices (2 deleted during testing), all types/statuses
✅ Location change:  Creates new location, updates couple
✅ Location history: Records old→new coords, distance, RF flag, materials snapshot
✅ Frontend:         Card view, table view, filters, detail page, forms all functional
✅ Existing features: Devices, personnel, inventory endpoints unaffected
```