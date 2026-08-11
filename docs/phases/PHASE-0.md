# Phase 0 — Foundation, branding, cleanup

**Goal:** a clean, correctly-branded, demo-free platform with the right roles and no stale authorization paths — the base every later phase builds on.

Chosen first because three of these are cheap and immediately visible, and one is a live security bug.

## Items

### 0.1 Branding — NavDashboard, never NavOS
The product is **NavDashboard**, an internal tool of **Nav Wireless Technologies Pvt Ltd** (navwireless.com), made by **Raj Patel, Head of Operations** (raj@navwireless.com, 9106860523).

- `TopNav` wordmark, `Sidebar` fallback label, dashboard subtitle, leadership share title, `global.css` comment, backend dashboard schema.
- Page `<title>`, login screen, and a credit line where it belongs (login footer + Settings → About), not scattered.

### 0.2 Remove seeding entirely
Production must start empty.

- Delete `modules/seeding/` (router, service, models, schemas, init) and its 5 endpoints.
- Delete the 6 per-module `/seed` endpoints: devices, couples, pairs, personnel, inventory, troubleshooting.
- Remove Settings → Demo Data.
- Remove the now-orphaned `seed_records` table.
- Ship `scripts/purge-demo-data.py` — one shot, explicit confirmation, prints what it will delete before doing it.

> **Why delete rather than hide behind a flag:** a seeding path that exists can be reached. `seed_records` currently registers all 63 rows in the database, so "remove demo data" would empty every seedable table — that is a loaded gun in a production system.

### 0.3 Eight role presets
Replace the five seeded roles with the eight in `PLAN.md` §2: Developer, Admin, Boss, Inventory Manager, Engineer, Rigger, Finance Manager, R&D.

Roles are data and editable; these are starting points, not fixed policy.

### 0.4 Fix the AI permission filter — **security**
`modules/ai_assistant/service.py::_allowed_types_for_user()` still calls the retired `get_permission_map()`. After the authz migration that returns a stale legacy fallback map for non-admins, so the AI's retrieval filter is computed from permissions the user may no longer have — or may never have had.

Rewrite `allowed_source_types()` against the new capability keys, so the model's context is filtered by what the caller can actually see. **The context is filtered, not the answer** — the model never receives rows the user cannot read.

### 0.5 Retire the dead permission module
`core/permissions.py` (section × level), the `user_permissions` table and `get_permission_map` / `get_scope_map`'s dependence on it. The scope helpers stay — they read `ROLE_DEFAULT_SCOPES`, which moves into the scope module rather than the retired one.

## Deliberately NOT in this phase

- Inventory model changes (Phase 1) — a schema this central should not ride along with a cleanup commit.
- Role *dashboards* (Phase 5). This phase creates the roles; it does not build their homes.
- Anything cosmetic beyond branding. The polish sweep is Phase 10.

## Done when

- `grep -ri navos` returns nothing outside git history and this doc set.
- No seeding endpoint is reachable; `scripts/audit-guards.py` shows 0 unmapped.
- 8 roles exist with sensible starting grants.
- A non-admin's AI context is provably narrower than an admin's.
- `verify-authz` / `verify-sessions` / `route-sweep` / `nav-personas` all still green.
