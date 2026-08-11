# NavDashboard — Where we are

**Read this first.** One screen, always current. Update it at the end of every working block.

**Last updated:** 2026-08-11
**Branch:** `navos/step-1-route-test`
**Live:** https://nav.madhur.dev (loopback `127.0.0.1:8085`)
**Plan:** [`PLAN.md`](./PLAN.md)

---

## Current phase

> **Phase 0 — Foundation, branding, cleanup.** IN PROGRESS.

### Next action
Start at Phase 0, item 1 in `docs/phases/PHASE-0.md`.

---

## Phase board

| Phase | Title | State |
|---|---|---|
| 0 | Foundation, branding, cleanup | **in progress** |
| 1 | Inventory core: custody, locations, condition | not started |
| 2 | Movement: outward, inward, handover, bundles | not started |
| 3 | Device Management ↔ Inventory, one identity | not started |
| 4 | Tasks, notifications, engineer home | not started |
| 5 | Role dashboards + Admin "View as" | not started |
| 6 | Finance, built for a phone | not started |
| 7 | Project archive | not started |
| 8 | Developer system-health dashboard | not started |
| 9 | WhatsApp sharing that carries content | not started |
| 10 | Mobile, polish and the sweep | not started |
| 11 | Deployment | not started |

---

## Already delivered (before this plan)

Nav shell (top bar + contextual sidebar + mobile tab bar), attendance with comp-off, daily updates with comments, leadership overview, project desktop-vs-field flow, and the **fine-grained permission engine**: ~122 capability keys, 247/247 operations mapped, enforced by one app-level dependency with a startup coverage assertion, plus revocable sessions and the `/settings/access` panel.

---

## How to verify anything

All of these write nothing, or clean up after themselves. **None may be run as ADMIN** — the legacy ADMIN role short-circuits every permission check, so an admin run proves nothing.

```bash
docker cp scripts/verify-authz.py navdashboard-backend-1:/tmp/va2.py && docker exec navdashboard-backend-1 python /tmp/va2.py
```

| Script | Proves | Baseline |
|---|---|---|
| `scripts/verify-authz.py` | permission enforcement, non-admin, over HTTP | 21/21 |
| `scripts/verify-sessions.py` | revocation is immediate | 14/14 |
| `scripts/verify-scope.py` | SELF/TEAM/ALL row ownership | 15/15 |
| `scripts/verify-attendance.py` | comp-off accrual rules | 16/16 |
| `scripts/audit-guards.py` | every operation is mapped | 232 keyed / 9 self / 6 public / **0 unmapped** |
| `scripts/route-sweep.mjs` | all routes render, 2 widths | 63/63 |
| `scripts/nav-personas.mjs` | nav as 3 non-admin roles | 7 / 7 / 8 tabs |

Browser scripts need a token and a user payload in the working directory:

```bash
UID=$(docker exec navdashboard-db-1 psql -U navdashboard -d navdashboard -t -A -c "SELECT id FROM users WHERE role='ADMIN' AND deleted_at IS NULL LIMIT 1")
docker exec navdashboard-backend-1 python -c "import sys;sys.path.insert(0,'/app');from core.security import create_access_token;print(create_access_token('$UID','ADMIN'))" | tail -1 > tok.txt
curl -s http://127.0.0.1:8085/api/v1/auth/me -H "Authorization: Bearer $(cat tok.txt)" > user.json
```

---

## Traps that have already cost time

1. **`route.path` has no router prefix** (`"/"` for the device list). Key anything route-related by endpoint `module.function`.
2. **A flat walk of `app.routes` finds one route.** This FastAPI wraps includes in `_IncludedRouter`; recurse via `.original_router` + `.include_context.prefix`.
3. **`app.router.dependencies.append()` after registration does nothing.** App-level dependencies go in the `FastAPI(...)` constructor.
4. **Browser tests need `localStorage.auth_user` *and* an intercepted `/auth/me`** — `Layout`'s `useCurrentUser()` overwrites an injected persona otherwise, and every persona silently renders as admin.
5. **The frontend is a static build.** Code changes need `docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build frontend`, not a restart.
6. **`nginx/default.conf` is a single-file bind mount.** `sed -i` changes the inode; the container keeps serving the old file until restarted.

---

## Rebuild and deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build backend frontend && docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d backend frontend
```
