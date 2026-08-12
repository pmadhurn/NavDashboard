# NavDashboard — Where we are

**Read this first.** One screen, always current. Update it at the end of every working block.

**Last updated:** 2026-08-11 (Phase 0 done)
**Branch:** `navos/step-1-route-test`
**Live:** https://nav.madhur.dev (loopback `127.0.0.1:8085`)
**Plan:** [`PLAN.md`](./PLAN.md)

---

## Current phase

> **Phase 10 — Mobile, polish, the sweep. DONE.**

Tables become cards below 768px. `assets.status` is dropped — custody is the
only answer. `scripts/polish-sweep.mjs` walks 42 routes x 2 themes at 390px and
checks for horizontal overflow, stuck spinners, blank pages and console errors:
**84 checks, 0 problems.**

### Next action
**Phase 11 — Deployment.** Purge demo data (`scripts/purge-demo-data.py
--confirm`), confirm backup covers every table, re-check secrets, then push to
GitHub.

---

## Phase board

| Phase | Title | State |
|---|---|---|
| 0 | Foundation, branding, cleanup | **done** |
| 1 | Inventory core: custody, locations, condition | **done** |
| 2 | Movement: outward, inward, handover, bundles | **done** |
| 3 | Device Management ↔ Inventory, one identity | **done** |
| 4 | Tasks, notifications, engineer home | **done** |
| 5 | Role dashboards + Admin "View as" | **done** |
| 6 | Finance, built for a phone | **done** |
| 7 | Project archive | **done** |
| 8 | Developer system-health dashboard | **done** |
| 9 | WhatsApp sharing that carries content | **done** |
| 10 | Mobile, polish and the sweep | **done** |
| 11 | Deployment | **next** |

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
| — | *both probe scripts self-clean on start, so a failed run never blocks the next* | |
| `scripts/verify-sessions.py` | revocation is immediate | 14/14 |
| `scripts/verify-scope.py` | SELF/TEAM/ALL row ownership | 14/14 |
| `scripts/verify-attendance.py` | comp-off accrual rules | 16/16 |
| `scripts/verify-custody.py` | custody, condition, ledger | 27/27 |
| `scripts/verify-movement.py` | handover, returns, kits, repairs | 26/26 |
| `scripts/verify-tasks.py` | tasks derive and self-clear | 18/18 |
| `scripts/audit-guards.py` | every operation is mapped | 268 ops, **0 unmapped** |
| `scripts/route-sweep.mjs` | all routes render, 2 widths | 63/63 |
| `scripts/nav-personas.mjs` | nav as 3 non-admin roles | 7 / 7 / 8 tabs |
| `scripts/polish-sweep.mjs` | 42 routes x 2 themes at 390px | 84 checks, 0 problems |
| `scripts/share-preview.mjs` | what each Share button sends | prints the messages |

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
6. **The browser token expires.** A stale `tok.txt` makes every request 401; the
   api client logs out and redirects, and Playwright reports "Execution context
   was destroyed" with nothing about auth. Re-mint before debugging the harness.
7. **`nginx/default.conf` is a single-file bind mount.** `sed -i` changes the inode; the container keeps serving the old file until restarted.

---

## Rebuild and deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build backend frontend && docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d backend frontend
```

---

## Deployment tooling

`scripts/purge-demo-data.py` empties every operational table so a deploy starts
clean. Dry-run by default; `--confirm` to act. It deliberately never touches
users, roles, role assignments, permission overrides or sessions — emptying
those would lock everyone out of the system it is preparing.

**Not yet run.** That is a Phase 11 step, not a cleanup step.
