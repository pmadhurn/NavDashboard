# NavDashboard — what must be true before production

Written 2026-08-12, against branch `navos/step-1-route-test`. Every state
claim below was checked against the running stack, not against the docs — a
few items `docs/DEPLOYMENT.md` still lists as outstanding are in fact already
done, and one credential nobody had flagged is still live.

`docs/DEPLOYMENT.md` remains the *how*. This is the *whether*.

---

## A. Blocking — credentials

These are all live secrets. Nothing else on this page matters until they are done.

| # | Item | State as checked | Who |
|---|---|---|---|
| A1 | **`POSTGRES_PASSWORD` is the one committed to git.** `backend/.env` was committed in `90b9a24` and later untracked — untracking does not unpublish. The database password in that commit is byte-for-byte the password the stack is using right now. | ❌ **Not rotated** | You |
| A2 | **Cloudflare tunnel token** removed from `docker-compose.yml` in `62fd5fb`, still in history, still valid until revoked in the Cloudflare dashboard. | ❌ Not revoked | You |
| A3 | **Clerk `sk_test_…` secret key** was pasted into a chat transcript, and the instance is the development one, `trusted-starling-62.clerk.accounts.dev`. Production needs its own Clerk instance and a fresh `CLERK_ISSUER` / `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`. | ❌ Dev instance live | You |
| A4 | `SECRET_KEY` rotated off the committed placeholder. | ✅ **Already done** — 64 chars, differs from the value in `90b9a24`. `DEPLOYMENT.md` still lists this as outstanding; it isn't. | — |
| A5 | `backend/.env` and `frontend/.env` untracked. | ✅ Confirmed by `git check-ignore` | — |
| A6 | **An admin JWT was committed to this branch.** `tok.txt` — browser-test scratch — was swept into `7618864` by a `git add -A` and pushed. Untracked and gitignored in `5b0adca`, but still readable in history. Claims: `role=ADMIN`, no `jti`, **expires 2026-08-13 05:56 UTC**. Because it carries no `jti` it cannot be revoked — it dies on expiry, or immediately if `SECRET_KEY` is rotated. | ⚠️ Live until 2026-08-13, or until A4 is redone | You: rotate `SECRET_KEY` again, or strip the blob from history and force-push |

> Rotating A1 means changing it in `backend/.env` **and** in the `db` service's
> environment, then recreating both containers. The volume keeps the data; the
> role password is changed with `ALTER USER`.

---

## B. Blocking — data and accounts

| # | Item | State | Who |
|---|---|---|---|
| B1 | **Run the purge.** `scripts/purge-demo-data.py` — dry run first, then `--confirm`. There are still 5 demo expenses, 3 demo projects and 14 demo assets in the database. It never touches users, roles or sessions. | ❌ Demo data present | You |
| B2 | **Link every personnel record to a login.** **0 of 5 are linked.** Until a person is linked they have no attendance, no tasks and no equipment custody — and, since this session, no notifications either: a handover to an unlinked person is delivered silently. | ❌ 0/5 linked | You |
| B3 | **Decide which admin is real.** Two ACTIVE admins exist: `admin@navdashboard.com` (the seeded one) and `pmadhurn@gmail.com`. Delete one, or keep both deliberately. | ⚠️ Two admins | You |
| B4 | Seeded admin password changed off the default. | ✅ Neither `admin123` nor `Admin@123` works on either account. | — |
| B5 | **Merge the PR.** Today's work adds 4 commits on top of the 36 already there and introduces no new migrations — but the branch as a whole carries schema changes, so merging is your call, not a self-merge. | ❌ Unmerged | You |

---

## C. Blocking — code

| # | Item | State |
|---|---|---|
| C1 | **Clerk sign-in was 500ing on every attempt** and its tokens could never be revoked. Fixed today (`a2ff55b`): every sign-in path now goes through `issue_session`, so a Clerk session is revocable and appears in the admin session list. | ✅ Fixed, verify-sessions 19/19 |
| C2 | **No rate limiting on `/auth/login`.** Nothing throttles password guessing, and `/auth/clerk` is unauthenticated (its outbound JWKS fetch is already rate-floored, but the endpoint itself is not). A public deployment wants a limiter or an upstream one at the edge. | ❌ **Open** |
| C3 | **Exports are unbounded.** `GET /assets/export` and `GET /projects/export` load every row with no `limit`, build the whole table in memory and render it. Invisible at 14 assets; a stalled worker at ~10,000. Add a cap, or a background job, before the inventory is real. | ⚠️ Known limit |
| C4 | 270/270 operations permission-mapped; the app refuses to start if that ever slips. | ✅ |
| C5 | Migrations at a single head (`e8f9a0b1c2d3`), matching the running database. | ✅ |
| C6 | `ENVIRONMENT=production`, `CORS_ORIGINS=https://nav.madhur.dev` — not the `*` default. Update it when the real domain lands. | ✅ / ⚠️ domain |

---

## D. Should do — not blocking

The four items deferred deliberately in the previous session, with their real cost.

| # | Item | Cost | Why it was deferred |
|---|---|---|---|
| D1 | **Two inventory systems coexist** — `fitting_materials` (per-couple consumables) and `assets`. Merging them touches the couple workflow. | ~2 days | The couple workflow was never in scope to change. |
| D2 | **1,906 inline `style={{`** across the frontend. Phase 10 shipped tables→cards and the sweep; the design-token sweep did not happen. | ~1 day | Phase note claimed it in scope. Honest gap. |
| D3 | **`/overview`** — the old device dashboard is still routed. Harmless, but it is a second home screen nobody navigates to. | ~15 min | Routing change, better done deliberately. |
| D4 | **Compulsory project updates aren't enforced per project.** The task list asks anyone on an active project — close, but not the same thing. | ~2 hours | Close enough to defer. |
| D5 | **Notification writers cover handovers only.** Repairs, returns and expense approvals still notify nobody. The engine is there; each writer is a few lines. | ~1 hour each | Scope was "the gap", not "every event". |

---

## E. Verification baseline

Re-run all of it after any of A–C. Anything below its number is a regression.

| Script | Baseline |
|---|---|
| `verify-custody.py` | 27/27 |
| `verify-movement.py` | **38/38** (was 26/26 — notification checks added) |
| `verify-tasks.py` | 18/18 |
| `verify-authz.py` | **26/26** (was 21/21 — export permissions added) |
| `verify-scope.py` | 14/14 |
| `verify-attendance.py` | 16/16 |
| `verify-sessions.py` | **19/19** (was 14/14 — Clerk revocation added) |
| `audit-guards.py` | **270** ops, 0 unmapped |
| `route-sweep.mjs` | 63/63 |
| `polish-sweep.mjs` | 84 checks, 0 problems |
| `nav-personas.mjs` | 6/6, settings blocked for all three non-admins |

Run the backend scripts with `docker cp … && docker exec …` as each file's
docstring shows. Browser scripts need a fresh `tok.txt` and `user.json` (see
`docs/STATUS.md`) and `PLAYWRIGHT_MODULE` pointing at an installed playwright.

**Never verify as ADMIN.** The legacy ADMIN role short-circuits every
permission check, so an admin run proves nothing.

---

## F. The traps that will cost you an hour

1. **The live stack is `docker-compose.yml + docker-compose.tunnel.yml`**, not `prod.yml`. `prod.yml` assumes a dedicated tunnel and a `TUNNEL_TOKEN`; the tunnel overlay rides the host's existing systemd cloudflared via `127.0.0.1:8085`.
2. **The frontend is a static build.** Source edits need `build frontend`, not a restart — and the prod image is tagged `navdashboard-frontend:prod` precisely so a plain `up -d` cannot start the dev stack on it.
3. **The backend has no source bind-mount in either production overlay.** `docker cp` + `restart` is fine for a test loop; only a rebuild is real.
4. **A stale `tok.txt` makes every browser script fail as "Execution context was destroyed"** with nothing about auth. Re-mint before debugging the harness.
5. **`/export` routes must be declared above `/{id}` routes.** FastAPI matches in declaration order; below it, `export` is parsed as a UUID and 422s.
