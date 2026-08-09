"""Central seeding: create demo data for every module, and remove exactly it.

Why this module exists
----------------------
Seeding used to be six unrelated `POST /<module>/seed` endpoints, and nothing
recorded what they made. This module keeps those seeders (they carry the
fixtures the rest of the app expects by name — "Couple A1", "IU-00001" — and
they are already wired to each other's output) but wraps every run so each
created row lands in `seed_records`.

Removal then deletes only registered ids, in reverse dependency order.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from modules.seeding.models import SeedRecord

# Creation order. Removal walks this list backwards.
#
# The first six mirror the dependency chain the legacy seeders already imply:
# couples look up personnel and inventory templates by name, pairs look up
# couples by name, troubleshooting looks up devices and couples by name.
SEED_ORDER: list[tuple[str, str]] = [
    ("material_template", "material_templates"),
    ("fitting_material", "fitting_materials"),
    ("person", "personnel"),
    ("device", "devices"),
    ("location", "locations"),
    ("couple", "couples"),
    ("pair", "pairs"),
    ("error_log", "error_logs"),
    ("project", "projects"),
    ("project_phase", "project_phases"),
    ("project_member", "project_members"),
    ("asset_category", "asset_categories"),
    ("asset", "assets"),
    ("expense_batch", "expense_batches"),
    ("fund_allocation", "fund_allocations"),
    ("expense_claim", "expense_claims"),
    ("expense", "expenses"),
]

TABLE_BY_TYPE = dict(SEED_ORDER)

# Rows that point at a seeded entity but are not themselves registered.
# Deleted just before their parent, because the FK would otherwise block it
# (or, worse, leave orphaned history behind).
CHILD_CLEANUP: dict[str, list[tuple[str, str]]] = {
    "device": [("device_status_history", "device_id")],
    "couple": [("location_history", "couple_id")],
    "person": [("assignment_history", "person_id")],
    "error_log": [("troubleshoot_entries", "error_log_id")],
    "project": [
        ("project_deployments", "project_id"),
        ("project_timeline_entries", "project_id"),
    ],
    "asset": [("asset_history", "asset_id")],
    "expense": [("expense_members", "expense_id")],
}


async def _register(
    db: AsyncSession, entity_type: str, ids: list[UUID], batch_id: UUID, origin: str = "seeder"
) -> int:
    """Record provenance, skipping ids already registered."""
    if not ids:
        return 0
    existing = set(
        (
            await db.execute(
                select(SeedRecord.entity_id).where(
                    SeedRecord.entity_type == entity_type,
                    SeedRecord.entity_id.in_(ids),
                )
            )
        )
        .scalars()
        .all()
    )
    added = 0
    for eid in ids:
        if eid in existing:
            continue
        db.add(
            SeedRecord(
                entity_type=entity_type,
                entity_id=eid,
                batch_id=batch_id,
                origin=origin,
            )
        )
        added += 1
    await db.flush()
    return added


async def _table_ids(db: AsyncSession, table: str) -> list[UUID]:
    """Every id currently in a table (including soft-deleted)."""
    rows = await db.execute(text(f"SELECT id FROM {table}"))
    return [r[0] for r in rows.fetchall()]


# --------------------------------------------------------------------------
# Seeders for modules that never had one
# --------------------------------------------------------------------------

async def _seed_locations(db: AsyncSession) -> list[UUID]:
    from modules.locations.models import Location

    count = await db.scalar(select(func.count()).select_from(Location))
    if count:
        return []
    fixtures = [
        (25.2048, 55.2708, "Dubai — Marina site"),
        (24.4539, 54.3773, "Abu Dhabi — Corniche site"),
        (25.3463, 55.4209, "Sharjah — Industrial area"),
    ]
    ids = []
    for lat, lon, note in fixtures:
        loc = Location(latitude=lat, longitude=lon, address_note=note)
        db.add(loc)
        await db.flush()
        ids.append(loc.id)
    return ids


async def _seed_projects(db: AsyncSession, user_id: UUID) -> dict[str, list[UUID]]:
    from modules.projects.models import Project, ProjectPhase, ProjectMember
    from modules.personnel.models import Person

    count = await db.scalar(select(func.count()).select_from(Project))
    if count:
        return {}

    now = datetime.now(timezone.utc)
    fixtures = [
        ("Marina Rooftop Rollout", "DEPLOYMENT", "ACTIVE", "Emaar Properties",
         "Dubai Marina", 25.2048, 55.2708, 45),
        ("Corniche POC", "POC", "ACTIVE", "ADNOC",
         "Abu Dhabi Corniche", 24.4539, 54.3773, 20),
        ("Industrial Area Survey", "SURVEY", "COMPLETED", "Sharjah Municipality",
         "Sharjah Industrial 12", 25.3463, 55.4209, 90),
    ]
    project_ids, phase_ids, member_ids = [], [], []

    for name, ptype, status, customer, site, lat, lon, age_days in fixtures:
        p = Project(
            name=name,
            project_type=ptype,
            status=status,
            customer_name=customer,
            site_location=site,
            latitude=lat,
            longitude=lon,
            start_date=now - timedelta(days=age_days),
            end_date=now + timedelta(days=30) if status == "ACTIVE" else now - timedelta(days=5),
            description=f"Demo project: {name}.",
            created_by=user_id,
        )
        db.add(p)
        await db.flush()
        project_ids.append(p.id)

        for idx, phase_type in enumerate(["SURVEY", "INSTALLATION", "COMMISSIONING"]):
            ph = ProjectPhase(
                project_id=p.id,
                phase_type=phase_type,
                status="COMPLETED" if idx == 0 else "ACTIVE",
                started_at=now - timedelta(days=age_days - idx * 5),
                note=f"Demo {phase_type.lower()} phase.",
            )
            db.add(ph)
            await db.flush()
            phase_ids.append(ph.id)

    people = list(
        (
            await db.execute(
                select(Person).where(Person.deleted_at.is_(None)).order_by(Person.created_at).limit(3)
            )
        )
        .scalars()
        .all()
    )
    for i, person in enumerate(people):
        pm = ProjectMember(
            project_id=project_ids[i % len(project_ids)],
            person_id=person.id,
            role_in_project=person.role,
        )
        db.add(pm)
        await db.flush()
        member_ids.append(pm.id)

    return {"project": project_ids, "project_phase": phase_ids, "project_member": member_ids}


async def _seed_assets(db: AsyncSession, user_id: UUID) -> dict[str, list[UUID]]:
    from modules.assets.models import Asset, AssetCategory

    count = await db.scalar(select(func.count()).select_from(Asset))
    if count:
        return {}

    now = datetime.now(timezone.utc)
    cat_ids, asset_ids = [], []
    for idx, cname in enumerate(["Test Equipment", "Tools", "Spares"]):
        c = AssetCategory(name=cname, sort_order=idx)
        db.add(c)
        await db.flush()
        cat_ids.append(c.id)

    fixtures = [
        ("AST-0001", "Spectrum Analyser", 0, "SERIALIZED", "SA-99120", 1, "IN_OFFICE", 4200.00),
        ("AST-0002", "Torque Wrench Set", 1, "SERIALIZED", "TW-4410", 1, "IN_OFFICE", 320.00),
        ("AST-0003", "RF Connector Pack", 2, "BULK", None, 50, "IN_OFFICE", 180.00),
        ("AST-0004", "Cable Tester", 0, "SERIALIZED", "CT-7781", 1, "DEPLOYED", 950.00),
    ]
    for code, name, cat_idx, kind, serial, qty, status, price in fixtures:
        a = Asset(
            asset_code=code,
            name=name,
            category_id=cat_ids[cat_idx],
            item_kind=kind,
            serial_number=serial,
            quantity=qty,
            status=status,
            purchase_date=now - timedelta(days=200),
            purchase_price=price,
            notes="Demo asset.",
        )
        db.add(a)
        await db.flush()
        asset_ids.append(a.id)

    return {"asset_category": cat_ids, "asset": asset_ids}


async def _seed_finance(db: AsyncSession, user_id: UUID) -> dict[str, list[UUID]]:
    from modules.finance.models import Expense, ExpenseBatch, ExpenseClaim, FundAllocation
    from modules.personnel.models import Person
    from modules.projects.models import Project

    count = await db.scalar(select(func.count()).select_from(Expense))
    if count:
        return {}

    now = datetime.now(timezone.utc)
    projects = list((await db.execute(select(Project).limit(3))).scalars().all())
    people = list(
        (await db.execute(select(Person).where(Person.deleted_at.is_(None)).limit(3)))
        .scalars()
        .all()
    )
    project_id = projects[0].id if projects else None

    batch = ExpenseBatch(
        title="August 2026 site expenses",
        notes="Demo batch.",
        created_by=user_id,
    )
    db.add(batch)
    await db.flush()

    alloc_ids = []
    for person in people[:2]:
        fa = FundAllocation(
            person_id=person.id,
            project_id=project_id,
            amount=5000.00,
            currency="INR",
            received_date=now - timedelta(days=20),
            source_note="Demo advance.",
            logged_by=user_id,
        )
        db.add(fa)
        await db.flush()
        alloc_ids.append(fa.id)

    claim = ExpenseClaim(
        title="Marina site travel claim",
        project_id=project_id,
        submitted_by=user_id,
        status="SUBMITTED",
        note="Demo claim.",
        submitted_at=now - timedelta(days=3),
    )
    db.add(claim)
    await db.flush()

    fixtures = [
        ("Site travel — Marina", 1250.00, "Travel", 12),
        ("Rooftop crane hire", 8600.00, "Equipment", 9),
        ("Team meals — install day", 940.00, "Food", 8),
        ("Replacement RF connectors", 2100.00, "Materials", 5),
        ("Fuel — survey run", 640.00, "Travel", 2),
    ]
    expense_ids = []
    for title, amount, category, age in fixtures:
        e = Expense(
            title=title,
            amount=amount,
            currency="INR",
            expense_date=now - timedelta(days=age),
            category=category,
            project_id=project_id,
            batch_id=batch.id,
            claim_id=claim.id if category == "Travel" else None,
            added_by=user_id,
            notes="Demo expense.",
            status="SUBMITTED",
        )
        db.add(e)
        await db.flush()
        expense_ids.append(e.id)

    return {
        "expense_batch": [batch.id],
        "fund_allocation": alloc_ids,
        "expense_claim": [claim.id],
        "expense": expense_ids,
    }


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------

async def seed_all(db: AsyncSession, user_id: UUID) -> dict:
    """Seed every module that is still empty. Idempotent by construction:
    each seeder no-ops when its table already has rows."""
    batch_id = uuid4()
    created: dict[str, int] = {}

    async def track(entity_type: str, ids: list[UUID]) -> None:
        if ids:
            created[entity_type] = await _register(db, entity_type, ids, batch_id)

    # --- legacy seeders, in the order their cross-references require ---
    from modules.inventory import service as inventory_service
    from modules.personnel import service as personnel_service
    from modules.devices import service as devices_service
    from modules.couples import service as couples_service
    from modules.pairs import service as pairs_service
    from modules.troubleshooting import service as troubleshooting_service

    before_templates = set(await _table_ids(db, "material_templates"))
    before_materials = set(await _table_ids(db, "fitting_materials"))
    await inventory_service.seed_inventory(db, user_id)
    await track(
        "material_template",
        [i for i in await _table_ids(db, "material_templates") if i not in before_templates],
    )
    await track(
        "fitting_material",
        [i for i in await _table_ids(db, "fitting_materials") if i not in before_materials],
    )

    await track("person", [p.id for p in await personnel_service.seed_personnel(db, user_id)])
    await track("device", [d.id for d in await devices_service.seed_devices(db, user_id)])
    await track("location", await _seed_locations(db))
    await track("couple", [c.id for c in await couples_service.seed_couples(db, user_id)])
    await track("pair", [p.id for p in await pairs_service.seed_pairs(db, user_id)])

    try:
        errors = await troubleshooting_service.seed_errors(db, user_id)
        await track("error_log", [e.id for e in errors])
    except Exception:
        # This seeder raises rather than no-ops when logs already exist.
        pass

    # --- modules that never had a seeder ---
    for group in (
        await _seed_projects(db, user_id),
        await _seed_assets(db, user_id),
        await _seed_finance(db, user_id),
    ):
        for entity_type, ids in group.items():
            await track(entity_type, ids)

    await db.commit()
    return {"batch_id": str(batch_id), "created": created, "total": sum(created.values())}


async def adopt_preview(db: AsyncSession) -> dict:
    """How many unregistered rows adopt would claim, per module. Read-only."""
    preview: dict[str, int] = {}
    for entity_type, table in SEED_ORDER:
        ids = await _table_ids(db, table)
        if not ids:
            continue
        registered = set(
            (
                await db.execute(
                    select(SeedRecord.entity_id).where(
                        SeedRecord.entity_type == entity_type,
                        SeedRecord.entity_id.in_(ids),
                    )
                )
            )
            .scalars()
            .all()
        )
        unregistered = [i for i in ids if i not in registered]
        if unregistered:
            preview[entity_type] = len(unregistered)
    return {"would_adopt": preview, "total": sum(preview.values())}


async def adopt_existing(db: AsyncSession) -> dict:
    """Mark every currently-unregistered row in the seedable tables as demo data.

    For databases seeded before `seed_records` existed — this one included, where
    devices/couples/pairs/personnel/error_logs were created by the old per-module
    endpoints and carry no provenance.

    DANGEROUS BY NATURE: it cannot distinguish "demo row created before the
    registry" from "real row you typed in yesterday". It claims both. That is why
    the caller must confirm against a count from `adopt_preview` first, and why
    the UI shows the per-module numbers before enabling the button.
    """
    batch_id = uuid4()
    adopted: dict[str, int] = {}
    for entity_type, table in SEED_ORDER:
        ids = await _table_ids(db, table)
        if ids:
            n = await _register(db, entity_type, ids, batch_id, origin="adopted")
            if n:
                adopted[entity_type] = n
    await db.commit()
    return {"batch_id": str(batch_id), "adopted": adopted, "total": sum(adopted.values())}


async def seed_status(db: AsyncSession) -> dict:
    """Per-module row counts alongside how many are registered as seeded."""
    modules = []
    for entity_type, table in SEED_ORDER:
        total = await db.scalar(text(f"SELECT COUNT(*) FROM {table}"))  # noqa: S608
        seeded = await db.scalar(
            select(func.count()).select_from(SeedRecord).where(
                SeedRecord.entity_type == entity_type
            )
        )
        modules.append(
            {
                "entity_type": entity_type,
                "table": table,
                "total_rows": int(total or 0),
                "seeded_rows": int(seeded or 0),
            }
        )
    registry_total = sum(m["seeded_rows"] for m in modules)
    # Rows present but not registered — demo data from before the registry
    # existed, or records created by hand. Adopt claims all of them, so the UI
    # must show this number before offering the button.
    unregistered = sum(
        max(m["total_rows"] - m["seeded_rows"], 0) for m in modules
    )
    return {
        "modules": modules,
        "seeded_total": registry_total,
        "unregistered_total": unregistered,
        "can_adopt": unregistered > 0,
    }


async def unseed_all(db: AsyncSession) -> dict:
    """Delete every registered row, children first, reverse dependency order.

    Only ids present in `seed_records` are touched.
    """
    removed: dict[str, int] = {}

    for entity_type, table in reversed(SEED_ORDER):
        ids = list(
            (
                await db.execute(
                    select(SeedRecord.entity_id).where(SeedRecord.entity_type == entity_type)
                )
            )
            .scalars()
            .all()
        )
        if not ids:
            continue

        for child_table, fk in CHILD_CLEANUP.get(entity_type, []):
            await db.execute(
                text(f"DELETE FROM {child_table} WHERE {fk} = ANY(:ids)"),  # noqa: S608
                {"ids": ids},
            )

        result = await db.execute(
            text(f"DELETE FROM {table} WHERE id = ANY(:ids)"),  # noqa: S608
            {"ids": ids},
        )
        removed[entity_type] = result.rowcount or 0

        await db.execute(
            text("DELETE FROM seed_records WHERE entity_type = :et AND entity_id = ANY(:ids)"),
            {"et": entity_type, "ids": ids},
        )

    await db.commit()
    return {"removed": removed, "total": sum(removed.values())}
