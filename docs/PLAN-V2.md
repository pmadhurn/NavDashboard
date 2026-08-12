# NavDashboard — Plan V2: Inventory promotion, movement UX, projects & learning

**Date:** 2026-08-12 · **Status:** awaiting user answers, then execution phase-by-phase
**Brief:** user's 2026-08-12 message (nav overflow, seeding removal, inline "add new", Inventory as top-level, required items, vendors, QR-driven inward/outward, learning section, deployed links in Device Management, link composition modeling, projects upgrade, team notifications).
**Companions:** [`STATUS.md`](./STATUS.md), [`PLAN.md`](./PLAN.md) (previous 12-phase build, all done), [`PRE-PRODUCTION.md`](./PRE-PRODUCTION.md).

The non-negotiables N1–N10 from `PLAN.md` §1 apply to every phase below. Every new endpoint gets an authz catalog key; nothing is verified as ADMIN; new tables go into `backup/exporter.py`.

---

## 0. What already exists (so we extend, not rebuild)

Confirmed against the code on 2026-08-12:

| Ask | Current state |
|---|---|
| Inventory placement | Inside **Field Operations** (`shared/config/workspaces.tsx`), 10 workspaces on the top bar |
| Nav overflow | CSS-only: `.navdash-tabs` hides labels below 1500px — breakpoint computed when there were 8 workspaces, now 10 → overflow at 100% zoom |
| Seeding | Central seeding module already deleted; **6 dead per-module `seed_*` service functions remain** (devices, couples, pairs, personnel, inventory, troubleshooting); demo rows still in live DB (5 expenses, 3 projects, 14 assets); `scripts/purge-demo-data.py` exists, never run |
| Categories | `asset_categories` DB table; form Select supports inline create on submit, but there is **no visible "+ Add new" affordance** |
| Vendors | `vendors` table exists (repairs + custody use it); **no standalone Vendors page**, no vendor on asset purchase |
| Required items | `AssetReport(report_type=REQUIREMENT)` exists with a small panel; no status workflow, no finance visibility, no vendor/cost |
| Outward/inward | Two engines: project `EquipmentMovement` (outward form, inline per-item receive) + asset custody ledger (`AssetHandover`, `AssetBundle` kits, `RETURN_OUTCOMES` incl. DAMAGED/LOST/LEFT_AT_SITE, two-party handover accept) |
| QR/barcode | `Asset.tag_identifiers` JSONB (`{barcode, qr, rfid}`) + resolve-by-code endpoint; **no generation, no printing, no camera scanning** |
| Serial policy | `Asset.item_kind` SERIALIZED\|BULK per row; serial always optional; **no per-category rule** |
| Projects | `status` free string (`UPCOMING/ACTIVE/ON_HOLD/COMPLETED/CLOSED/ARCHIVED` hardcoded in 2 frontend files); phases, members, timeline, `ProjectDeployment` (device/couple/pair/asset ↔ project); **no documents tab, no team-at-create, no notifications** |
| Devices | Device → Couple (`has_rf`, location) → Pair; types IU/OU/HC/RF; **no model/version (1G/10G), no gyro entities**; Map plots couples with status/RF/pair filters |
| Deployed | `/inventory/deployed` lives under Field Operations |
| Email | **None** — no SMTP anywhere; notifications are in-app only (`tasks` module) |
| Learning/help | **None** |

---

## 1. Open questions (answers gate execution)

Answered by the user 2026-08-12:

| # | Question | Answer |
|---|---|---|
| Q1 | Email for project-team notifications | **Build the full mail service + Admin SMTP settings panel; ships configured-off until creds are pasted.** In-app notifications work immediately. |
| Q2 | Purge live demo data? | **Yes** — delete dead seed code AND run `purge-demo-data.py --confirm` (dry-run shown first). |
| Q3 | Rename Pairs → Links? | **Yes** — UI says Links everywhere; DB/API keep `pair` internally. |
| Q4 | Top bar | **Consolidate + auto-collapse**: fold Downloads into Field Operations (Leadership stays its own tab) → 10 tabs, plus a measured trailing "More ▾" collapse so the bar fits at any width/zoom. |
| Q5 | QR labels | **Both layouts** — A4 sticker grid and single-label (thermal) format, selectable at print time. |
| Q6 | Deploy at end? | **Yes** — rebuild + deploy to nav.madhur.dev, verify against the deployed stack, commit and push. **Constraint: the product must stay easily deployable to www.navdashboard.com (separate Cloudflare account) once the founder approves — no hardcoded nav.madhur.dev anywhere in the product; domain stays config (env/compose), deploy steps documented.** |
| Q7 | Learning format | **Illustrated guides** — `/learn`, step cards with SVG diagrams, minimal words. |

---

## 2. Phases

Each phase ends deployable, verified (non-admin), and committed. Order: visible-first, then data model, then flows that depend on it.

### Phase 1 — Navigation: Inventory promoted, Deployed moved, overflow fixed
- **Inventory becomes its own top-level workspace**: Assets, Required Items (Phase 4), Vendors (Phase 4), Returns, Handovers, Kits, Repairs.
- **Field Operations keeps**: Projects, Documents (and Downloads if consolidated per Q4).
- **Deployed moves to Device Management** (`/inventory/deployed` route aliased or moved; nav entry under Devices next to Map).
- **Overflow fix**: replace the stale 1500px CSS breakpoint with real measurement — tabs that don't fit collapse into a trailing "More" dropdown (or per Q4). Verified at 100% zoom, 1280px and 1440px widths, plus 390px mobile (bottom bar unchanged).
- Update `nav-personas.mjs` / `route-sweep.mjs` expectations.

### Phase 2 — Seeding: dead code out, demo data out
- Delete the 6 dead `seed_*` service functions + dead entries in `scripts/gen-authz-map.py`.
- Per Q2: run `purge-demo-data.py` (dry-run, show output, then `--confirm`).
- `grep -ri seed` clean outside migrations/purge script.

### Phase 3 — "Add new" inside every data-backed dropdown
- One shared `CreatableSelect` component: explicit **“+ Add new …”** row at the end of the options list; opens a minimal inline create (name + required fields), selects the new row on success, permission-gated (hidden without the create key).
- Applied to: asset **category**, **vendor**, **stock location**, **kit** (in outward), **customer**. (Enums that are code-level — device types, severities, outcomes — deliberately excluded: they carry behavior.)

### Phase 4 — Inventory: Required Items + Vendors
- **Required items**: promote `REQUIREMENT` reports into a first-class `item_requests` flow — anyone can request (name, qty, reason, needed-by); Inventory manages status `REQUESTED → APPROVED → ORDERED → RECEIVED / REJECTED`; optional vendor + estimated cost; boss-ready list view (open items first).
  - **Finance visibility**: `inventory.requirements_read` granted to Finance role preset; Finance sees the list (read + comment/estimated-cost) from their workspace.
- **Vendors page**: CRUD (model exists), shows purchase history + repairs per vendor.
- **Vendor on purchase**: optional `vendor_id` on `assets` (alongside `purchase_price`/`purchase_date`) and on item requests. Never compulsory.
- Backup exporter gains the new/changed tables.

### Phase 5 — QR/barcode: generate, print, scan
- **Generation**: server-side QR (self-hosted lib) encoding `asset_code`; stored in `tag_identifiers.qr`. Endpoint returns SVG/PNG.
- **Printing**: label sheet builder — select assets → printable page of stickers (code + name + QR), format per Q5.
- **Scanning**: camera scanner component (self-hosted JS decoder, works on phone browsers over HTTPS) wired into: outward item picker, inward/returns resolution, handover selection, and a global "scan" action on Inventory. Resolves via the existing resolve-by-code endpoint.
- **Serial policy**: `requires_serial` flag on `asset_categories` (Inventory manager decides per category); asset form + movement forms enforce serial entry only where the category demands it; bulk/small items (patch cords etc.) stay quantity-only.

### Phase 6 — Movement UX: the buttery-smooth outward/inward
- **Outward, engineer-initiated**: purpose (TESTING / POC / DEPLOYMENT / OTHER) + project optional (required only for DEPLOYMENT); start from a kit (prefilled, editable) or empty; add items by search **or camera scan**; serial-required items must be serial-resolved, bulk items by quantity; review → submit.
- **Gate pass**: every outward produces a printable/QR-verifiable gate-pass view (list + who + when + purpose) — replaces the paper form the security guard checks; security can open it read-only from a QR on the pass.
- **Inward against the outward**: open outwards listed; per-item outcome (RETURNED / DAMAGED / LEFT_AT_SITE / HANDED_TO_CUSTOMER / LOST — engine exists) with scan-to-tick; partial inward allowed, remainder stays open; nothing closes silently.
- Unify the two engines at the write level: project equipment movements record through the custody ledger so "where is item X" has one answer.

### Phase 7 — Device model: versions, gyro, link composition
- **`model` on devices** (data-backed `device_models` list: e.g. OpticSpectra 1G, OpticSpectra 10G, RF model names, gyro models) — creatable via Phase 3 pattern.
- **New device types**: GYRO, GYRO_CONTROLLER (gyro cable/power cables remain bulk inventory items, not devices).
- **Link composition**: pair (= link) detail shows the full bill of materials — 2 IU + 2 OU + 2 HC (+ power), optional RF pair + patch cords, optional gyro set — derived from couple membership; gaps visible ("no RF on side B").
- **Deployed in Device Management**: deployed list keyed by link/couple with project association; **map** gains a Deployed filter and dot-click → project link; project page links back to the map.

### Phase 8 — Projects upgrade
- **Buckets**: Upcoming / Ongoing (ACTIVE+ON_HOLD) / Completed (COMPLETED+CLOSED+ARCHIVED); completed **collapsed by default**; status list defined once, not duplicated in 2 files.
- **Documents tab** on project detail: upload/list/download via existing documents module (`entity_type='project'`); DocumentsPage gains the project option.
- **Team at create**: select members while creating a project (engineers can create); members get an in-app notification and — per Q1 — an email with project name, start date, site.
- Deployed-links section on the project page → map.

### Phase 9 — Email service (scope per Q1)
- `modules/mail/`: SMTP settings via env/system settings; async send, fail-soft (logged, never blocks the request); first consumer = project team assignment; template = project name, dates, site, link.
- If no creds yet: ships configured-off, admin settings panel ready to accept creds later.

### Phase 10 — Learning section
- `/learn`: per-module illustrated guides (inventory outward/inward with QR, required items, projects, finance, attendance) — step cards with SVG graphics, minimal words, mobile-first; format per Q7. Static frontend content, no backend.

### Phase 11 — Verification, deploy, push
- Authz coverage 100% (`audit-guards.py`), new tables in backup exporter, verify-* suite + route-sweep + polish-sweep re-baselined, both themes, 390px.
- Update `STATUS.md`, this file, and the obsidian log.
- Commit + push per phase; final rebuild + deploy to nav.madhur.dev per Q6.

---

## 3. Sequencing logic

Nav first — it is the cheapest visible win and every later phase adds nav entries to the new shape. Seeding second — deletion before new features means nothing new is built on demo rows. The "add new" pattern (3) precedes Required Items/Vendors (4) which consume it. QR (5) precedes Movement UX (6) which is its main consumer. Device modeling (7) stands alone but must precede the map/deployed work it feeds. Projects (8) before email (9) because the notification needs the team-at-create hook. Learning (10) is last of the builds — it documents screens only once they stop moving.
