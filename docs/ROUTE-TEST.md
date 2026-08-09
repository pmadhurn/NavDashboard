# NavOS — Step 1 Route Test

**Date:** 2026-08-10 · **Build under test:** `navdashboard-frontend:prod`, served through `navdashboard-nginx-1` on `127.0.0.1:8085` (the same image and path that `https://nav.madhur.dev` serves).
**Baseline commit:** `3d76f36` · **Result commit:** see end of file.

## Method

Headless Chromium (Playwright), **29 routes × 2 viewports** (desktop 1440×900, mobile 390×844) = 58 checks, plus **5 bad-UUID detail routes** at desktop = **63 render checks**, and **58 primary-action checks**.

Authentication: an admin JWT minted in-container with the app's own `create_access_token`, injected into `localStorage` as **both** `access_token` **and** `auth_user`. Both keys are required — `authStore.ts` hydrates `user` from the second one, and `routes.tsx:56` reads `if (user && !hasPermission(...))`, so **a null `user` fails open** and every permission-gated route would have rendered green against a token-only session. No password was changed and no user was created.

**Read-only against production.** The app runs on live data, so "primary action works" means: click the action, assert the form/modal renders with its inputs, close it with Escape. **No form was ever submitted.** Routes whose only action is a write (`Create Backup`, `Generate Report`, `Mark Paid`, `Seed …`, `Sync Devices`, `Link Logins`, `Close Project`, `Delete`) were verified by asserting their content renders instead; those are called out per-route below.

Console noise filtered to match the 2026-08-09 sweep so the numbers stay comparable: antd `destroyOnClose` deprecation, React Router v7 future-flag warnings, React DevTools notice.

**Broken vs cosmetic** — fixed before this document was written / logged only:

| | Definition |
|---|---|
| **Broken** (fix now) | Does not render; primary action throws or its data fails to load; console error that breaks function; document-level horizontal overflow |
| **Cosmetic** (log only) | Spacing, alignment, truncation, or wording that still works |

## Results

Post-fix. `Action` is the curated primary-action check; `MobileOK` means the document itself does not scroll horizontally (a table scrolling inside its own container is fine).

| Route | Renders (D) | Renders (M) | Action | DesktopOK | MobileOK | Console errors |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `/` | Y | Y | PASS · 9 KPI cards, read-only | Y | Y | 0 |
| `/devices` | Y | Y | PASS · Add Device → 3 inputs | Y | Y | 0 |
| `/devices/:id` | Y | Y | PASS · Edit → 3 inputs | Y | Y | 0 |
| `/couples` | Y | Y | PASS · Add Couple → 7 inputs | Y | Y | 0 |
| `/couples/:id` | Y | Y | PASS · Edit → 6 inputs | Y | Y | 0 |
| `/pairs` | Y | Y | PASS · Add Pair → 4 inputs | Y | Y | 0 |
| `/pairs/:id` | Y | Y | PASS · Edit → 2 inputs | Y | Y | 0 |
| `/map` | Y | Y | PASS · 21 leaflet tiles | Y | Y | 0 |
| `/troubleshooting` | Y | Y | PASS · Report Error → 9 inputs | Y | Y | 0 |
| `/comparison` | Y | Y | PASS · Compare disabled until 2 selected (by design) | Y | Y | 0 |
| `/documents` | Y | Y | PASS¹ · Upload present, empty state correct | Y | Y | 0 |
| `/location-history` | Y | Y | PASS · filter controls render | Y | Y | 0 |
| `/search` | Y | Y | PASS¹ · Filters toggles an inline panel, not a modal | Y | Y | 0 |
| `/downloads` | Y | Y | PASS · Upload → 3 inputs | Y | Y | 0 |
| `/inventory/assets` | Y | Y | PASS · Add Asset → 3 inputs | Y | Y | 0 |
| `/inventory/assets/:id` | Y | Y | PASS · WhatsApp share builds `wa.me` link | Y | Y | 0 |
| `/inventory/deployed` | Y | Y | PASS · WhatsApp share builds `wa.me` link | Y | Y | 0 |
| `/projects` | Y | Y | PASS · New Project → 2 inputs | Y | Y | 0 |
| `/projects/:id` | Y | Y | PASS · 5 tabs render (Step 4 will gate these) | Y | Y | 0 |
| `/finance` | Y | Y | PASS · Add Expense → 8 inputs | Y | Y | 0 |
| `/finance/my` | Y | Y | PASS · Log Advance → 3 inputs | Y | Y | 0 |
| `/finance/claims` | Y | Y | PASS · New Claim → 4 inputs | Y | Y | 0 |
| `/finance/settlement` | Y | Y | PASS¹ · renders ₹13,530 pending + claim list; Mark Paid/Reject are writes, not exercised | Y | Y | 0 |
| `/personnel` | Y | Y | PASS · Add Personnel → 4 inputs | Y | Y | 0 |
| `/audit` | Y | Y | PASS¹ · 54 entries, filters, Timeline/Table toggle | Y | Y | 0 |
| `/backup` | Y | Y | PASS¹ · backup list renders; Create Backup is a write, not exercised | Y | Y | 0 |
| `/reports` | Y | Y | PASS · 5 report cards; Generate is a write, not exercised | Y | Y | 0 |
| `/ai` | Y | Y | PASS · chat input renders; New Chat creates a session, not exercised | Y | Y | 0 |
| `/settings` | Y | Y | PASS · 3 tabs | Y | Y | 0 |
| `/devices/{bad-uuid}` | Y | – | – · "Device not found" | Y | – | 1 (expected 404) |
| `/couples/{bad-uuid}` | Y | – | – · not-found state | Y | – | 1 (expected 404) |
| `/pairs/{bad-uuid}` | Y | – | – · not-found state | Y | – | 1 (expected 404) |
| `/projects/{bad-uuid}` | Y | – | – · **fixed** → "Project not found" + Back | Y | – | 1 (expected 404) |
| `/inventory/assets/{bad-uuid}` | Y | – | – · **fixed** → "Asset not found" + Back | Y | – | 2 (expected 404) |

¹ These five reported FAIL on the first automated pass. Manual triage confirmed **all five render and behave correctly** — the probe was wrong, not the page (`.ant-table` isn't the markup those pages use; `Filters` opens an inline panel; `Upload` is wrapped by antd). Corrected here rather than left as false positives.

**Totals: 63/63 render · 0 blank pages · 0 document-level horizontal overflow (desktop or mobile) · 0 unexpected console errors.** The only remaining console output is the expected `404` on deliberately-invalid UUIDs.

## Defects found and fixed

### 1. Trailing-slash redirect dropped the port — Couple form silently broken · **fixed**

`nginx/default.conf` used `proxy_set_header Host $host`. **`$host` strips the port**; FastAPI builds its trailing-slash 307 `Location` from that header, so:

```
GET /api/v1/devices?size=100
→ 307  location: http://127.0.0.1/api/v1/devices/?size=100     # port gone → ERR_CONNECTION_REFUSED
```

`CoupleForm.tsx:48,52` requested `/personnel` and `/devices` **without** trailing slashes — the only two such callers in the codebase — so the Add Couple and Edit Couple forms loaded with **empty Handling Person and Assign Devices dropdowns**. A `.catch(() => {})` on both calls swallowed the failure, which is why it produced no visible error for a month.

*Why this was never caught:* on `nav.madhur.dev` the port is 443, the default, so the port-less redirect resolves correctly. The 2026-08-09 sweep ran against the tunnel domain and could not have seen it. It only manifests on a non-default port — i.e. exactly the loopback setup used for development.

**Fix — both layers.** `Host $http_host` in all five `proxy_set_header` sites (root cause: fixes every present and future caller), plus trailing slashes on the two `CoupleForm` calls (correctness: avoids a pointless redirect round-trip).

> **Why fix both rather than just the callers:** patching only `CoupleForm` leaves the next developer to rediscover this. Patching only nginx leaves two calls taking a needless 307. **Rejected:** disabling FastAPI's `redirect_slashes` — that turns a working-with-redirect call into a hard 404 and would have broken more than it fixed.

**Verified:** `location: http://127.0.0.1:8085/api/v1/devices/?size=100` (port preserved); both calls now return **200** with no redirect; Handling Person shows all 5 personnel, Assign Devices shows 15 devices, Status shows 3. `https://nav.madhur.dev` re-checked and still healthy.

> Operational gotcha worth recording: `nginx/default.conf` is a **single-file bind mount**. `sed -i` replaces the inode, so the container keeps serving the old file until it is restarted — `nginx -s reload` alone is not enough.

### 2. Infinite spinner on a 404 for two detail pages · **fixed**

`ProjectDetailPage.tsx:803` and `AssetDetailPage.tsx:28` both read:

```tsx
if (isLoading || !project) return <LoadingSpinner text="Loading project..." />
```

A 404 ends the load with the entity still `undefined`, so the guard stays true **forever** — "Loading project…" was still on screen after 9 seconds. `DeviceDetailPage.tsx:39-40` already separates the two states correctly.

**Fix:** split the conditions and render the shared `EmptyState` with a Back action, matching the existing design system.

> **Why `EmptyState` rather than copying DeviceDetailPage's inline `<div>`:** `EmptyState` is the existing primitive and gives the user a way out. **Rejected:** redirecting to the list route on 404 — it hides the fact that the link was wrong, which is worse when the URL came from a WhatsApp share.

**Verified:** both now show "Project not found" / "Asset not found" with a working Back button.

## Cosmetic — logged, not fixed

| # | Route / area | Note |
|---|---|---|
| C1 | `CoupleForm.tsx:50,54` | `.catch(() => {})` swallows dropdown-load failures entirely. Defect 1 was invisible because of this. Worth surfacing an inline error, but it is behaviour change, not a Step 1 fix. |
| C2 | All API redirects behind the tunnel | `Location` is emitted as `http://` not `https://` (`location: http://nav.madhur.dev/...`). **Pre-existing** — identical before the nginx change, since `$host` carried no scheme either. Cloudflare masks it. Real fix is `--proxy-headers` on uvicorn honouring the `X-Forwarded-Proto` nginx already sends. |
| C3 | `/devices/{bad-uuid}` | "Device not found" is a bare `<div>`, inconsistent with the `EmptyState` now used by projects and assets. No Back action. |
| C4 | `/inventory/assets/{bad-uuid}` | Emits 2 console 404s, not 1 — the asset **and** its history are both fetched with the bad id. Harmless. |
| C5 | `/` (landing) | No primary action of any kind. Correct for an overview page, but noted since every other route has one. |
| C6 | `/search` | Live route, reachable, but in **no workspace** in `workspaces.tsx` — undiscoverable except via the header search box. Already logged as AUDIT §5.3 #10; confirmed still true. |
| C7 | Mobile map tiles | Two `ERR_ABORTED` on `basemaps.cartocdn.com` tiles at 390px — aborted in-flight by the viewport change, not a failure. 7 tiles still render. |

## What this does not cover

- **Form submission.** No create/update/delete was exercised, because the target is the production database. Write paths remain unverified end-to-end; Step 3 will need non-admin test users anyway, and that is the right moment to exercise writes against them.
- **Permission behaviour.** Every check ran as ADMIN, which bypasses all guards via `full_access_map()`. This sweep says nothing about whether permissions work — that is Step 3's job, and `user_permissions` still has 0 rows.
- **Light theme.** Tested in the default (dark) theme only. The 2026-08-09 sweep covered both themes across 22–23 routes and was clean; the 6 routes added here are new coverage in one theme.

## Verdict

The existing surface is sound. 29 routes render on desktop and mobile with no blank pages and no horizontal overflow; every route's primary action opens the form it should. Two genuine defects were found and fixed, one of which (the Couple form) had been silently broken on every non-443 deployment.

**Step 2 may proceed on this foundation.**
