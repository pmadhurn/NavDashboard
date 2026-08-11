# NavDashboard — Road to Deployment

**Owner:** Raj Patel, Head of Operations · Nav Wireless Technologies Pvt Ltd
**Status file:** [`STATUS.md`](./STATUS.md) — read that first; it says which phase is live and what to do next.
**Companions:** [`AUDIT.md`](./AUDIT.md) (what exists), [`ARCHITECTURE.md`](./ARCHITECTURE.md) (how it is built and why).

---

## 0. The one-paragraph brief

NavDashboard is the internal operating platform for Nav Wireless. It replaces paper outward forms, Word files, WhatsApp threads, Excel sheets and verbal handovers with one system. **The people who must find it easy are riggers and field engineers, on a phone, at a site, at the end of a long day.** Everything else — the history, the audit trail, the inventory ledger — is machinery that must stay out of their way. The rule for every screen:

> **Open → see what needs doing → do it → done.**

If a feature cannot be explained in one sentence to a rigger, it is designed wrong.

---

## 1. Non-negotiables (apply to every phase)

These are acceptance criteria, not aspirations. A phase is not done until its work satisfies all of them.

| # | Rule | How it is checked |
|---|---|---|
| N1 | **Every process terminates.** No spinner without a timeout and an error state. No wizard without a cancel. No pending record with no way to resolve it. | Every new page in the route sweep; every new workflow has an explicit "abandon" path |
| N2 | **Mobile is the primary target**, not a fallback. Thumb-reachable primary action, no horizontal page scroll, tables degrade to cards below 768px. | Route sweep at 390px, 0 document-level overflow |
| N3 | **Both themes.** Every new surface is checked in light and dark. | Screenshot both; no hardcoded hex outside the token file |
| N4 | **Every button does something and says what happened.** Success and failure both produce visible feedback. | Manual pass per phase; no silent `.catch(() => {})` |
| N5 | **No dead ends.** A user without permission is guided, never scolded. Empty states say what to do next, not "no data". | Copy review per phase |
| N6 | **Server enforces, client only hides.** Every new endpoint gets a catalog key; startup coverage stays at 100%. | `assert_full_coverage()` + `scripts/audit-guards.py` |
| N7 | **Nothing is verified as ADMIN.** ADMIN short-circuits every check. | `scripts/verify-*.py`, `scripts/nav-personas.mjs` |
| N8 | **History is permanent.** Every state change on equipment, money, people and projects writes an append-only record naming who, when and why. | Model review per phase |
| N9 | **No demo data in production paths.** | Phase 0 removes it; nothing reintroduces it |
| N10 | **Branding is NavDashboard.** Never NavOS. | `grep -ri navos` returns nothing outside history |

---

## 2. People and roles

Eight roles. Each gets its own home screen; none sees a menu built for someone else.

| Role | Exists for | Home screen answers |
|---|---|---|
| **Developer** | Building and diagnosing the platform | Is it healthy? What broke? What is the fix? |
| **Admin** | Running the company's use of it — users, access, settings | Who needs approving, what is pending, what changed |
| **Boss / Management** | Seeing everything, doing almost nothing | What is happening across projects, money, people, equipment |
| **Inventory Manager** | Custody of every physical item | What is out, what is overdue, what is broken, what is pending my action |
| **Engineer (site team)** | Field work | What do I owe today — attendance, update, expense, equipment |
| **Rigger (site team)** | Field work, lighter | Same as engineer, fewer surfaces |
| **Finance Manager** | Money in and out | Who is owed what, what needs approving, what is unreconciled |
| **R&D team** | Troubleshooting and device health | What is failing, what needs diagnosis, device history |

> **Why Developer is separate from Admin:** the Admin account will be handed to other people. Diagnostics, system health, migration state and raw platform controls should not travel with it. Admin controls *the company's use* of the software; Developer controls *the software*.

---

## 3. The central redesign: custody, not status

This is the decision the whole Inventory brief rests on, so it is stated once here.

**Today** `assets.status` is a single enum (`IN_OFFICE`, `DEPLOYED`, …) plus `current_project_id` and `current_person_id`. That cannot express "damaged, and still at the customer's site", or "in the Halol factory", or "at a repair vendor" — because *where a thing is*, *who is answerable for it* and *what condition it is in* are three different facts crammed into one column.

**Change to three independent axes:**

```
custody_type   LOCATION | PERSON | PROJECT | CUSTOMER | VENDOR
custody_id     → stock_locations | personnel | projects | customers | vendors
condition      OK | DAMAGED | UNDER_REPAIR | LOST | RETIRED
```

*Available* stops being a stored value and becomes a derived one: `custody_type = LOCATION AND condition = OK`. A number that is computed cannot drift from the facts that produce it.

> **Rejected:** adding more enum values to `status` (every new combination multiplies the enum — `DEPLOYED_DAMAGED`, `AT_VENDOR_REPAIRABLE` — and none of them can be queried sensibly); and a separate table per location type (five near-identical tables, and "move this from the storeroom to a person" becomes a cross-table transaction).

**Locations become data, not code.** `stock_locations` seeds Office, R&D, Storeroom, Halol Factory, and the Inventory Manager adds more. Hardcoding four places guarantees a fifth exists by next quarter.

**One ledger.** Every custody or condition change appends to `asset_movements` — who, when, from, to, why, and the document that caused it. The current state on `assets` is a cache of the last ledger row, so the two can always be reconciled and the history can never be edited away.

---

## 4. Phases

Each phase ends deployable, verified and committed. **Do not start a phase before the previous one is committed and green** — that is what makes a session limit survivable.

### Phase 0 — Foundation, branding, cleanup · *quick, visible, low risk*
- Rename **NavOS → NavDashboard** everywhere (4 code sites + page title, favicon, login, footer). Add the "made by" credit and company link.
- **Remove all seeding**: `modules/seeding/`, six per-module `/seed` endpoints, Settings → Demo Data, and the seeded demo rows themselves. Ship a one-shot purge script so a fresh deploy starts empty.
- **Seed the 8 role presets** replacing the current 5.
- **Fix the AI permission filter** — `_allowed_types_for_user()` still calls the retired `get_permission_map()`, so after the authz migration a non-admin's AI context is computed from a stale fallback map. This is a live information-disclosure path and is fixed here, not in the AI phase.
- Delete the dead section×level module (`core/permissions.py`) and the unread `user_permissions` table.

**Done when:** `grep -ri navos` is clean, no seed endpoint exists, 8 roles present, AI context filters on real permission keys, coverage still 100%.

### Phase 1 — Inventory core: custody, locations, condition
- `stock_locations`, `customers`, `vendors` tables.
- `assets`: add `custody_type`, `custody_id`, `condition`; migrate existing rows from `status`; keep `status` writing for one release, then drop.
- `asset_movements` ledger replacing/absorbing `asset_history`.
- Item detail page: identity, custody now, condition, and the full timeline.
- Inventory list: filter by location, custody, condition, category, person, project.

**Done when:** every asset shows where it is, who holds it and what condition it is in; every change appears in its timeline.

### Phase 2 — Movement: outward, inward, handover, bundles, customers
- **Outward** from the app, replacing the Word form: pick project, pick items (or a bundle), record who is taking them.
- **Inward with per-item outcome** — the mismatch problem. 10 out, 7 back is never "3 missing"; each item is resolved as `RETURNED | LEFT_AT_SITE | HANDED_TO_CUSTOMER | DAMAGED | LOST`, with site, project, responsible person and expected return where it applies.
- **Handover** between engineers: sender selects many items → receiver is notified → **receiver must accept** → custody moves. Chain preserved (A → B → C).
- **Bundles/kits**: named sets the Inventory Manager maintains; issuing expands to individual items so per-item tracking never breaks.
- **Goodwill / handed to customer**: never deletes the item; marks custody `CUSTOMER` with who, why, when, and stays in history.
- **Repair workflow**: damage report → repairable? → vendor, cost, sent, received → back to stock or retired.

**Done when:** a rigger can complete an outward and an inward on a phone, and the Inventory Manager can answer "where is item X" for every item in the system.

### Phase 3 — Device Management ↔ Inventory, one identity
- A device creates/links exactly one asset automatically; no duplicate records.
- Device Management keeps technical identity (pairs, map, location history, troubleshooting, comparison, reports). Inventory owns custody and lifecycle.
- Custody changes reflect in the device view; deployment shows in both.

**Done when:** no device exists in one system and not the other, and neither module loses a feature.

### Phase 4 — Tasks, notifications, engineer home
- `notifications` and a derived **task list**: attendance not submitted, project update pending, expense pending, equipment overdue, handover awaiting acceptance, document missing.
- **Engineer/rigger home is the task list.** Nothing else competes for attention.

**Done when:** an engineer opens the app and can clear the day's obligations without using the menu.

### Phase 5 — Role dashboards + Admin "View as"
- A home screen per role (§2), each answering that role's one question.
- **View as** for Admin/Developer: preview any role's navigation and dashboard. A persistent banner says it is a preview. **It changes what is shown, never what is permitted** — the server keeps enforcing the real identity, so a preview can never become a privilege escalation.

**Done when:** each role's home is distinct and useful, and View As cannot grant anything.

### Phase 6 — Finance, built for a phone
- Add Expense reachable in two taps; receipt straight from the camera; **an expense with no receipt is allowed and clearly flagged**, because a blocked expense is an unrecorded expense.
- Advances issued, drawn down, balance visible to both the holder and Finance.
- Finance view: per project, per person, given vs spent vs remaining vs owed; approve, query, mark paid.

**Done when:** an engineer records a day's spending in under a minute on a phone.

### Phase 7 — Project archive
- Ongoing / upcoming / completed / archived.
- Everything in one place: team, head, updates, site visits, photos, videos, documents, reports, equipment out and back, customer info, testing, troubleshooting, communications.
- Compulsory updates where assigned, surfaced as tasks (Phase 4), never as nagging.

**Done when:** a project from a year ago can be reconstructed from its page alone.

### Phase 8 — Developer system-health dashboard
- Plain-language status: what is up, what is failing, which service, which process.
- Each problem states **what happened → why → what to do**, with the action where one exists.
- Covers: database, storage (MinIO), AI service, migrations, authz coverage, failed jobs, unusual activity.

**Done when:** a non-specialist can read it and know whether to worry.

### Phase 9 — WhatsApp sharing that carries content
- Share builds a formatted, readable summary — finance figures, device status, project update, inventory position — not a bare link.
- Footer: *Shared via NavDashboard.com*.
- **Permission-checked at build time**: you can only share what you could see.

**Done when:** a shared message is useful to someone with no login.

### Phase 10 — Mobile, polish and the sweep
- Tables → cards below 768px across every list.
- Token sweep over the remaining inline styles.
- Every button, every state, both themes, every terminal state (N1–N5) verified page by page.

**Done when:** the whole app passes the non-negotiables, not just the new parts.

### Phase 11 — Deployment
- Clean database, real users, real roles, no demo residue.
- Secrets rotated, env documented, backup covering every table.
- Final full verification run, then **push to GitHub**.

---

## 5. Sequencing logic

Phase 0 first because branding and seed removal are cheap, visible, and the AI filter is a live disclosure bug. Phases 1–3 are one arc and must stay in order: custody before movement, movement before device unification, or the unification has nothing stable to point at. Phase 4 must precede 5, because a role dashboard with no task feed is a set of numbers nobody acts on. Phases 6–9 are independent of each other and can be reordered if priorities change. Phase 10 must be last of the build phases — polishing surfaces that are still moving is wasted work. Phase 11 is the gate.

## 6. Working rules for future sessions

1. **Read `STATUS.md` first.** It names the current phase and the next action.
2. **One phase per working block.** Commit before starting the next.
3. **Write the phase note** (`docs/phases/PHASE-N.md`) *before* coding it: what is being built, what is being changed, what is deliberately not being done.
4. **Verify as a non-admin.** Always.
5. **Record decisions with their rejected alternatives**, in `ARCHITECTURE.md`. A decision without its alternative is a preference.
6. **If a phase reveals the plan is wrong, change the plan and say why.** The plan serves the work.
