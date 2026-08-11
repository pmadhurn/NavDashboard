# Phase 1 — Inventory core: custody, locations, condition

**Goal:** for every physical item, answer *where is it*, *who is answerable for it*, and *what condition is it in* — and be able to show how it got there.

The model decision and its rejected alternatives are in [`PLAN.md` §3](../PLAN.md). This note is the build.

## What changes

### 1.1 Places and parties become data
`stock_locations` (Office, R&D, Storeroom, Halol Factory, + whatever comes next), `customers`, `vendors`. Hardcoding four places guarantees a fifth exists by next quarter, and "handed to a customer" and "at a repair vendor" are custody states that need something to point at.

### 1.2 Three axes on `assets`
```
custody_type  LOCATION | PERSON | PROJECT | CUSTOMER | VENDOR
custody_id    → the row in that table
condition     OK | DAMAGED | UNDER_REPAIR | LOST | RETIRED
```
Migrated from the existing `status`: `IN_OFFICE` → LOCATION/Office, `DEPLOYED` → PROJECT (using `current_project_id`), anything with a `current_person_id` → PERSON. `status` keeps being written for one release so nothing that still reads it breaks; Phase 2 drops it.

**Availability is derived, never stored**: `custody_type = LOCATION AND condition = OK`. A computed number cannot drift from the facts underneath it.

### 1.3 `asset_movements` — one ledger
Every custody or condition change appends a row: from, to, why, who, when, and the document that caused it. The columns on `assets` are a cache of the newest row, so the two can always be reconciled and history can never be edited away.

Absorbs `asset_history`, which recorded status changes only and had never been written to.

### 1.4 Surfaces
- **Item detail**: identity, custody now, condition now, and the full timeline.
- **List**: filter by location, custody type, condition, category, person, project. Counts by location on top.

## Deliberately NOT in this phase

- Outward/inward, handover, bundles, repair workflow — Phase 2. This phase gives them the ground to stand on.
- Device↔asset unification — Phase 3.
- Dropping `assets.status` — one release later, so a rollback stays possible.

## Done when

- Every asset shows where it is, who holds it, what condition it is in.
- Every change to either appears in that item's timeline with a reason.
- Existing rows migrated with no loss: counts before and after match.
- Non-admin verification green; coverage 100%.
