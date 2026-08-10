# NavOS — Target Architecture

**Date:** 2026-08-10 · **Status:** proposal, awaiting approval · **Companion:** [`AUDIT.md`](./AUDIT.md)

Every section states the choice, **why**, and **what was rejected**. Where the repo already implements something, this document says *extend*, not *replace* — per the ground rule about not rewriting working modules.

---

## 1. Navigation model

### 1.1 Decision

**Keep the existing workspace rail + contextual sidebar. Extend it; do not rebuild it.** Add a mobile bottom bar as a third surface.

> **Why:** the repo already implements exactly the pattern the brief asks for — `WorkspaceRail.tsx` switches modules, `Sidebar.tsx` renders that module's items, and `shared/config/workspaces.tsx` is a single declarative registry where a new module costs one array entry. **Rejected:** a horizontal top nav (burns the scarcest axis — vertical space — on desktop, and collapses to a hamburger on mobile, which is the pattern the brief explicitly rejects); and a flat single sidebar (already outgrown at 29 routes).

### 1.2 The three surfaces

| Surface | Desktop | Mobile | Contains |
|---|---|---|---|
| **Module switcher** | 60px icon rail, left edge | Bottom bar, 5 slots max | Workspaces |
| **Contextual nav** | Collapsible sidebar, 240/64px | Drawer, opened from the header | Items within the active workspace |
| **Page chrome** | `PageHeader` (title, actions, share) | Same, wrapping; primary action also as a FAB | Per-page actions |

> **Why a bottom bar rather than reusing the drawer for switching:** module switching is the single most frequent navigation act for a field user, and on mobile the drawer costs two taps and a thumb stretch to the top-left. **Rejected:** keeping the workspace chips inside the drawer (works, but buries the primary axis); a floating segmented control (no room alongside a FAB).

### 1.3 Workspaces after this brief

Seven, up from five. Rail order is deliberate: daily-use first.

| # | Workspace | Accent | Items | Change |
|---|---|---|---|---|
| 1 | **Home** | secondary | `/` | unchanged |
| 2 | **My Work** | new | My Day, My Attendance, My Expenses, My Updates | **new** — the field user's whole app |
| 3 | **Field Operations** | existing | Projects, Inventory, Deployed, Documents, Downloads | unchanged |
| 4 | **Device Management** | existing | Devices, Couples, Pairs, Map, Location History, Troubleshooting, Comparison, Reports | unchanged |
| 5 | **Finance** | existing | Expenses, Claims, Advances, Settlement | +Advances |
| 6 | **People** | new | Personnel, Attendance Board, Daily Updates, Comp-off Balances | **new** — splits people out of Admin |
| 7 | **Assistant** | existing | AI Assistant, Search | +Search (fixes: `/search` is in no workspace today) |
| 8 | **Admin** | existing | Users & Roles, Permissions, Audit, Backup, System Settings | +Roles, +Permissions |

Plus **`/leadership`**, reachable from the rail *only* for holders of `leadership:VIEW`. It is a destination, not a workspace — it has no sub-nav by design (Phase 6: "density of information, not density of controls").

> **Why "My Work" as its own workspace:** the brief's Phases 5 and 6 are written for a site technician on a phone with a few taps. Scattering attendance under People, expenses under Finance and updates under a leadership module makes their five daily actions live in three workspaces. **Rejected:** adding these as items inside existing workspaces (cheaper, but makes the most common user the worst-served one).

---

## 2. Route tree

Additions marked **NEW**. Everything unmarked exists today and is untouched.

```
/                                   Home — platform overview (exists)
/leadership                         NEW  leadership home; leadership:VIEW

My Work                             NEW workspace
  /me                               NEW  my day: today's attendance, open advances, my updates
  /me/attendance                    NEW  my attendance calendar + day-type entry
  /me/expenses                          → alias of existing /finance/my
  /me/updates                       NEW  my posted updates

Field Operations                    (unchanged)
  /projects  /projects/:id
  /inventory/assets  /inventory/assets/:id  /inventory/deployed
  /documents
  /downloads

Device Management                   (unchanged)
  /devices  /devices/:id
  /couples  /couples/:id
  /pairs    /pairs/:id
  /map  /location-history  /troubleshooting  /comparison  /reports

Finance                             (+1)
  /finance          /finance/my        /finance/claims      /finance/settlement
  /finance/advances                 NEW  advance register; finance:MANAGE

People                              NEW workspace
  /personnel                            (moves here from Admin)
  /attendance                       NEW  team attendance board; attendance:VIEW
  /attendance/:personId             NEW  one person's month
  /updates                          NEW  chat-style daily-update timeline; updates:VIEW
  /updates/:id                      NEW  single update + comment thread
  /compoff                          NEW  accrual/consumption balances; attendance:VIEW

Assistant
  /ai
  /search                           (moved into nav; route already exists)

Admin                               (+2)
  /settings                             system settings
  /settings/users                       users & approval queue
  /settings/roles                   NEW  role presets → permission templates
  /settings/permissions             NEW  user × section × level × scope matrix editor
  /audit  /backup
```

> **Why `/me/*` aliases rather than moving `/finance/my`:** the finance page works and is linked from elsewhere; aliasing costs one route entry and zero risk. **Rejected:** moving the route (breaks bookmarks and the WhatsApp share links already in the wild).

---

## 3. Data model additions

Seven new tables. **No existing table is altered except `user_permissions`** (one nullable column) and `personnel` (one nullable column).

### 3.1 Attendance

```
attendance_days
  id              uuid PK
  person_id       uuid NOT NULL  FK → personnel(id)
  day             date NOT NULL
  day_type        varchar(20) NOT NULL   -- ON_FIELD | IN_OFFICE | AT_HOME | HOLIDAY | LEAVE | COMP_OFF_TAKEN
  project_id      uuid NULL      FK → projects(id)      -- required when ON_FIELD
  phase_id        uuid NULL      FK → project_phases(id)
  departed_at     timestamptz NULL     -- ON_FIELD: left for site
  completed_at    timestamptz NULL     -- ON_FIELD: work complete
  note            text NULL
  logged_by       uuid NOT NULL  FK → users(id)
  created_at / updated_at / deleted_at
  UNIQUE (person_id, day) WHERE deleted_at IS NULL
```

> **Why one row per person per day, not clock-in/clock-out pairs:** the brief is explicit — "day-type tracking, not clock-in/clock-out". A multi-day site trip is N rows of `ON_FIELD`, which keeps "how many field days in July" a `COUNT(*)` instead of an interval intersection. **Rejected:** a date-range row per trip (breaks the moment one day inside the trip is a holiday, and makes a monthly calendar a range-overlap query).

```
comp_off_ledger
  id              uuid PK
  person_id       uuid NOT NULL  FK → personnel(id)
  entry_type      varchar(10) NOT NULL   -- ACCRUED | CONSUMED | ADJUSTED
  days            numeric(4,2) NOT NULL  -- signed: +1.0 accrued, -1.0 consumed
  source_day_id   uuid NULL      FK → attendance_days(id)   -- the weekend worked, or the day taken
  reason          text NULL
  created_by      uuid NOT NULL  FK → users(id)
  created_at
```

> **Why an append-only ledger rather than a `comp_off_balance` counter on `personnel`:** the brief requires tracking accrual *and* consumption with a running balance; a counter cannot answer "which Saturdays earned this". Balance = `SUM(days)`. **Rejected:** a materialised balance column (drifts the first time anything is corrected; the audit trail is the product here).

Accrual rule: a `day_type = ON_FIELD` row falling on Sat/Sun inserts one `ACCRUED` row. Implemented in the attendance service on write, **not** a DB trigger — so the rule is testable and visible where the rest of the business logic lives.

### 3.2 Daily updates

```
daily_updates
  id            uuid PK
  author_id     uuid NOT NULL  FK → users(id)
  person_id     uuid NULL      FK → personnel(id)     -- denormalised for team filters
  project_id    uuid NULL      FK → projects(id)
  body          text NOT NULL
  posted_for    date NOT NULL                          -- the day being reported on
  created_at / updated_at / deleted_at

update_comments
  id            uuid PK
  update_id     uuid NOT NULL  FK → daily_updates(id) ON DELETE CASCADE
  author_id     uuid NOT NULL  FK → users(id)
  body          text NOT NULL
  created_at / updated_at / deleted_at
```

> **Why a dedicated `update_comments` table rather than reusing `project_timeline_entries`:** the timeline is append-only system-and-note history scoped to a project; updates are person-scoped, dated, and threaded. Overloading the timeline would put comments on projects that have no comments. **Rejected:** a generic polymorphic `comments(entity_type, entity_id)` — no second consumer exists yet, and the repo already has four unconstrained polymorphic tables (see AUDIT §2.2 #4); adding a fifth on spec is not earned.

### 3.3 Permissions

```
ALTER TABLE user_permissions ADD COLUMN scope varchar(10) NOT NULL DEFAULT 'ALL';
  -- SELF | TEAM | ALL

roles
  id            uuid PK
  name          varchar(50) UNIQUE NOT NULL
  description   text NULL
  is_system     boolean NOT NULL DEFAULT false   -- ADMIN/TECHNICIAN/VIEWER, not deletable
  created_at / updated_at

role_permissions
  id            uuid PK
  role_id       uuid NOT NULL  FK → roles(id) ON DELETE CASCADE
  section       varchar(30) NOT NULL
  level         varchar(10) NOT NULL
  scope         varchar(10) NOT NULL DEFAULT 'ALL'
  UNIQUE (role_id, section)
```

> **Why add `scope` to the existing table rather than build a new authz system:** section × level is already the right shape and already enforced in 79 endpoints; it is missing exactly one dimension — *whose* records. Defaulting to `'ALL'` means every existing row and every existing check keeps its current meaning. **Rejected:** row-level security in Postgres (moves business rules out of the layer that already holds them, and the app connects as one DB user); and per-object ACL rows (right for Downloads, which already has `download_item_access`; overkill for expenses and attendance).

> **Why `roles` becomes a table:** the brief requires Admin to grant a Finance permission set to "one or many people". Today `ROLE_DEFAULT_PERMISSIONS` is a hardcoded Python dict for two roles. **Rejected:** leaving roles as an enum and only granting per-user (works, but every new hire becomes a manual 11-checkbox exercise).

`users.role` stays as-is during migration and becomes a FK to `roles.name` only after §5 step 4 — see "what stays untouched".

### 3.4 Sections added

`SECTIONS` in `core/permissions.py` gains: **`attendance`**, **`updates`**, **`leadership`**, **`exports`**. Existing eleven unchanged.

### 3.5 One column on `personnel`

```
ALTER TABLE personnel ADD COLUMN team_lead_id uuid NULL REFERENCES personnel(id);
```

> **Why:** `scope = TEAM` needs a definition of "team", and project membership alone can't answer it between projects. **Rejected:** deriving the team from current `project_members` (a person between projects would have no team and no lead could approve their attendance).

---

## 4. Permission model

### 4.1 Shape

**subject → (section, level, scope)**, resolved as: explicit `user_permissions` row → the user's role's `role_permissions` → `NONE`. ADMIN keeps its `full_access_map()` bypass.

Levels (unchanged): `NONE < VIEW < EDIT < MANAGE`
Scopes (new): `SELF < TEAM < ALL`

### 4.2 Matrix

Rows are the four proposed role presets (Admin can define more); cells are `level/scope`.

| Section | Viewer | Technician (field) | Team Lead | Finance | Leadership | Admin |
|---|---|---|---|---|---|---|
| `devices` | VIEW/ALL | EDIT/ALL | EDIT/ALL | – | VIEW/ALL | MANAGE/ALL |
| `troubleshooting` | VIEW/ALL | EDIT/ALL | EDIT/ALL | – | VIEW/ALL | MANAGE/ALL |
| `projects` | VIEW/ALL | EDIT/TEAM | MANAGE/TEAM | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| `inventory` | VIEW/ALL | EDIT/ALL | EDIT/ALL | – | VIEW/ALL | MANAGE/ALL |
| `documents` | VIEW/ALL | EDIT/TEAM | EDIT/TEAM | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| `downloads` | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| `finance` | VIEW/SELF | EDIT/SELF | EDIT/TEAM | MANAGE/ALL | VIEW/ALL | MANAGE/ALL |
| **`attendance`** | VIEW/SELF | EDIT/SELF | MANAGE/TEAM | – | VIEW/ALL | MANAGE/ALL |
| **`updates`** | VIEW/ALL | EDIT/SELF | EDIT/SELF | VIEW/ALL | EDIT/ALL | MANAGE/ALL |
| **`leadership`** | – | – | – | – | VIEW/ALL | VIEW/ALL |
| `personnel` | – | VIEW/ALL | VIEW/TEAM | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| `reports` | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| **`exports`** | – | EDIT/SELF | EDIT/TEAM | MANAGE/ALL | VIEW/ALL | MANAGE/ALL |
| `ai` | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | VIEW/ALL | MANAGE/ALL |
| `admin` | – | – | – | – | – | MANAGE/ALL |

Notes:
- **Finance is a permission set, not a user type** — already true; the "Finance" column is just a preset holding `finance: MANAGE/ALL`. Grant it to one person or ten.
- **Leadership** is likewise a preset, not a role hierarchy.
- Level→verb mapping stays as-is: `VIEW` = GET, `EDIT` = POST/PUT on own-or-scoped records, `MANAGE` = delete, approve, settle, configure.

### 4.3 Enforcement

One dependency, everywhere:

```python
Depends(require_permission("attendance", "EDIT", scope_owner=lambda body: body.person_id))
```

`require_permission` gains an optional owner resolver; when the caller's scope is `SELF` it must match the caller's `person_id`, when `TEAM` it must be in the caller's team, when `ALL` no check.

> **Why extend the existing dependency rather than add middleware:** it is already imported by 5 routers and 79 endpoints; a second mechanism would make three. **Rejected:** FastAPI middleware (cannot see path params or the request body without re-parsing) and per-service checks (invisible in the route signature, which is how the current mess happened).

**`require_role` is deleted.** All **46** `Depends(require_role(...))` call sites across 11 routers migrate to `require_permission`, and the **87 operations** currently reachable by any authenticated user (31 of them in seven routers with no guard at all) each get one. That is **133 of 217 operations** to touch. This is the single largest correctness item in the whole brief and it is not optional — it is the acceptance criterion "permissions enforced server-side".

---

## 5. Migration order

Each step ends with the app building, running, and the device module verified. Nothing half-migrated is committed.

| # | Step | Why here | Ends with |
|---|---|---|---|
| **0** | **Commit the working tree.** 133 modified + 13 untracked files, uncommitted since 2026-07-10. Untrack `frontend/.env`. | There is currently **no rollback point**. Every step below is unsafe without one. | A clean `git status` and a tagged baseline |
| **1** | ~~Fix `scripts/*.sh`~~ → **new read-only Playwright harness.** Walk all 29 routes × 2 viewports. **Done 2026-08-10** — see [`ROUTE-TEST.md`](./ROUTE-TEST.md). | "Verified, not assumed" needs a *before* to compare against | 63/63 render, 0 overflow, 2 defects fixed |
| **2** | **Authorization unification.** Add `scope` + `roles` + `role_permissions`; extend `require_permission`; migrate all 46 `require_role` sites; guard the 87 operations reachable by any authenticated user; seed the five role presets from §4.2. | Every later module inherits it; retrofitting is what created today's split | Non-admin users provably 403 where they should. Fixes AUDIT §5.3 #1, #2 |
| **3** | **Backup coverage.** Add the 6 missing business tables to `backup/exporter.py` (`user_permissions`, four `download_*`, both `equipment_movement*`) plus the new tables from step 4 onward. | Adding modules that a restore silently drops is worse than not adding them | Backup covers every business table. Fixes AUDIT §5.3 #3 |
| **4** | **Shared export service.** Lift the ~270 lines from `finance/service.py` into `modules/exports/`; Finance consumes it unchanged; Projects becomes the second consumer. | Two consumers is the point at which the abstraction is real — building it with one is speculative | Identical finance exports (byte-compare the xlsx), plus project export |
| **4b** | **Project-flow differentiation.** Make `ProjectDetailPage`'s tab set conditional on the project's active `phase_type`: a `DESKTOP_SURVEY` phase hides the Equipment (inward/outward) and Team tabs; a `PHYSICAL_SURVEY` phase shows them. Data model already supports this; only the page changes. | The brief's "project types differ and must not be forced into one flow" is the one Phase 3 requirement that is modelled but not implemented (AUDIT §5.2) | A desktop survey shows Timeline + Phases + Deployed only. Fixes the ❌ in AUDIT §5.2 |
| **5** | **Design-system consolidation + mobile.** Token sweep over inline styles, bottom nav, tables→cards below 768px, thumb-reachable primary action. | Attendance and Daily Updates are mobile-first; building them on today's desktop-shaped primitives means building them twice | Every existing page re-swept clean at 390px |
| **6** | **Attendance** (`attendance_days`, `comp_off_ledger`, `/me/attendance`, `/attendance`, `/compoff`) | Smallest new module; first real exercise of `scope = SELF/TEAM` | Field user can log a day in ≤3 taps |
| **7** | **Daily updates + leadership home** (`daily_updates`, `update_comments`, `/updates`, `/leadership`) | Leadership home aggregates attendance, so attendance must exist | Timeline + inline comments + cross-module leadership metrics |
| **8** | **Admin engine completion** (`/settings/roles`, `/settings/permissions` matrix editor) | Editing a permission model that isn't finished until step 2 is pointless; doing it last means the UI is built against the final shape | Admin can define a role and grant per-module, per-scope access |

### What stays untouched

- **The entire device module** — devices, couples, pairs, map, location history, troubleshooting, comparison. Behaviour, routes, and schema unchanged. Only their router *guards* change in step 2, and step 1's sweep is the proof.
- **Projects, Assets, Finance, Downloads business logic** — the outward/conflict engine, phase model, advances and claims all satisfy the brief. Step 2 touches their guards (already correct), step 4 touches finance's export *location*, not its output.
- **AI assistant, search, audit trail, seeding, backup** — except backup's table list (step 3).
- **The `Base`/`SoftDeleteMixin`/`CustomFieldsMixin` model conventions, the axios client, the TanStack Query per-module hook pattern, zustand stores.** New modules copy these; they do not introduce alternatives.
- **`fitting_materials` vs `assets`.** Two inventory systems is real debt (AUDIT §4.2 #2), but merging them touches `CoupleDetailPage` and the couple workflow, which the brief does not ask to change. **Deferred, deliberately, and recorded here so it is not forgotten.**

### Plan changes (recorded per the acceptance criteria)

**2026-08-11 — Steps resequenced to visible-first, at the user's direction.** New order: **5 → 4b → 2 → 6 → 7 → 3 → 4 → 8**.

> **Why:** the user asked for "things which actually make work seen" first. Step 2's own stated rationale — *"every later module inherits it; retrofitting is what created today's split"* — applies to the **new** modules (Attendance, Updates), not to Steps 4b and 5, which touch existing pages only and change no router guard. So 4b and 5 can safely front-run it. **Step 2 still precedes Steps 6 and 7**, because those are the first consumers of `scope = SELF/TEAM` and building them against a scopeless model would mean building them twice. **Rejected:** moving Step 2 to the very end (fastest visible progress, but Attendance and Daily Updates are exactly the modules that need per-user scoping, so they would need reworking).

**2026-08-11 — Step 1.1 nav model reversed: the top bar is back.** §1.1 rejected a horizontal top nav. The user's follow-up brief asks for "better navigation. Combination of top and side," and confirmed on 2026-08-11 that workspace switching should move to a top bar with the sidebar reserved for the active workspace's pages.

> **Why the original rejection no longer holds:** it argued a top nav "collapses to a hamburger on mobile." That is only true if the top bar is the *only* switcher. Here mobile keeps a dedicated bottom tab bar, so the hamburger carries the contextual drawer, not the modules — the pattern the brief rejects is avoided. The vertical-space cost is one 56px bar, which replaces the header that already existed, so the net cost is zero. **Rejected:** top-bar-only with dropdown menus per module (29+ routes hidden behind hover menus).

**2026-08-11 — Step 4b done, and the gate is phase-positive.** Implemented as: hide Equipment and Team when **every** phase is `DESKTOP_SURVEY`.

> **Why tested positively rather than by absence of a field phase:** `modules/seeding/service.py` was writing `phase_type` values the API's own validator rejects (`SURVEY`, `COMMISSIONING`) and `project_type` values outside `VALID_TYPES` (`DEPLOYMENT`, `SURVEY`). An "no field phase found → desk-only" rule would read those unknown values as desk-only and hide tabs the project needs. The seeder is fixed in the same commit, but the frontend must not depend on that. A project with **no** phases keeps all tabs — unknown is not desk-only.

**2026-08-10 — Step 1 method changed.** The plan said "fix `scripts/*.sh`". It was instead replaced by a new Playwright harness (`scripts/route-sweep.mjs`, `scripts/route-actions.mjs`).

> **Why:** the bash scripts prove liveness by **POSTing records into the production database** ("Smoke Test Cable", "Smoke Test POC"), which is unacceptable for a regression baseline run repeatedly against live data. The new harness is read-only — it opens each primary action's form and closes it without submitting — and produces machine-readable JSON that can be diffed after Step 3. **Rejected:** pointing the bash scripts at a throwaway database (would then no longer test the deployment that actually serves users). The bash scripts are left in place, still stale, and are now superseded for this purpose.

**2026-08-10 — Step 1 tested one theme, not two.** The plan said 2 widths × 2 themes. Executed as 2 widths × 1 theme (dark). **Why:** the 2026-08-09 sweep already cleared both themes across 22–23 routes; the incremental value was in the 6 never-tested routes, and doubling the matrix for a known-clean axis was not worth the runtime. The 6 new routes remain untested in light theme — carried into Step 5, which touches theming anyway.

### Known risks

1. **Step 2 will break things.** 87 operations currently accept any logged-in user; some frontend calls will start 403-ing. Mitigated by step 1's baseline and by seeding role presets before flipping guards — but expect a fix-up pass.
2. **`user_permissions` is empty and both users are ADMIN**, so nothing in the live DB exercises a non-admin path. Step 2 must create test users per preset; without them the migration is unverifiable.
3. **Comp-off accrual is a policy question, not a technical one.** "Saturdays/Sundays worked on field" is implemented as stated, but half-days, public holidays falling on a weekend, and expiry are undefined. Flagged, not guessed — see AUDIT §6.

---

*This document is updated whenever the plan changes, with the reason, per the acceptance criteria.*
