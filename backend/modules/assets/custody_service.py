"""Custody and condition changes, and the ledger that records them.

Every function here writes an `asset_movements` row. That is the point: the
columns on `assets` are a cache of the newest movement, so a change that skips
the ledger produces a position nobody can explain.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.assets.custody_models import (
    CONDITIONS,
    CUSTODY_LOCATION,
    CUSTODY_TYPES,
    AssetMovement,
    Customer,
    StockLocation,
    Vendor,
)
from modules.assets.models import Asset
from shared.audit import record_audit

logger = logging.getLogger(__name__)

# custody_type -> (table, label column). Used to turn a custody_id into a name
# without five branches at every call site.
_HOLDER_TABLES = {
    "LOCATION": ("stock_locations", "name"),
    "PERSON": ("personnel", "full_name"),
    "PROJECT": ("projects", "name"),
    "CUSTOMER": ("customers", "name"),
    "VENDOR": ("vendors", "name"),
}


async def holder_label(db: AsyncSession, custody_type: str, custody_id) -> Optional[str]:
    """Human name of whoever holds an item, whichever table they live in."""
    if custody_type == "UNKNOWN" or not custody_id:
        return None
    entry = _HOLDER_TABLES.get(custody_type)
    if not entry:
        return None
    table, column = entry
    from sqlalchemy import text

    return (
        await db.execute(
            text(f"SELECT {column} FROM {table} WHERE id = :i"), {"i": str(custody_id)}
        )
    ).scalar_one_or_none()


async def _validate_holder(db: AsyncSession, custody_type: str, custody_id) -> None:
    if custody_type not in CUSTODY_TYPES:
        raise BadRequestException(
            f"custody_type must be one of {sorted(CUSTODY_TYPES)}"
        )
    if custody_type == "UNKNOWN":
        return
    if not custody_id:
        raise BadRequestException(f"custody_id is required when custody_type is {custody_type}")
    if await holder_label(db, custody_type, custody_id) is None:
        raise NotFoundException(f"No {custody_type.lower()} with that id")


async def move_custody(
    db: AsyncSession,
    asset: Asset,
    *,
    to_custody_type: str,
    to_custody_id=None,
    event_type: str = "MOVED",
    reason: Optional[str] = None,
    expected_return_date: Optional[datetime] = None,
    quantity: int = 1,
    source_type: Optional[str] = None,
    source_id=None,
    user_id: Optional[UUID] = None,
    commit: bool = True,
) -> AssetMovement:
    """Move an item, and record why.

    `commit=False` lets a caller move several items inside one transaction —
    an outward form issuing ten items should be one unit of work, not ten.
    """
    await _validate_holder(db, to_custody_type, to_custody_id)

    movement = AssetMovement(
        asset_id=asset.id,
        event_type=event_type,
        from_custody_type=asset.custody_type,
        from_custody_id=asset.custody_id,
        to_custody_type=to_custody_type,
        to_custody_id=to_custody_id,
        from_condition=asset.condition,
        to_condition=asset.condition,
        quantity=quantity,
        reason=reason,
        source_type=source_type,
        source_id=source_id,
        performed_by=user_id,
    )
    db.add(movement)

    asset.custody_type = to_custody_type
    asset.custody_id = to_custody_id
    asset.expected_return_date = expected_return_date

    asset.current_person_id = to_custody_id if to_custody_type == "PERSON" else None
    asset.current_project_id = to_custody_id if to_custody_type == "PROJECT" else None

    if commit:
        await db.commit()
        await db.refresh(asset)
    else:
        await db.flush()
    return movement


async def set_condition(
    db: AsyncSession,
    asset: Asset,
    *,
    condition: str,
    reason: Optional[str] = None,
    event_type: Optional[str] = None,
    source_type: Optional[str] = None,
    source_id=None,
    user_id: Optional[UUID] = None,
    commit: bool = True,
) -> AssetMovement:
    """Change what state an item is in, without moving it.

    Condition and custody are independent: an item can be damaged wherever it
    happens to be, and reporting damage should not silently relocate it.
    """
    if condition not in CONDITIONS:
        raise BadRequestException(f"condition must be one of {sorted(CONDITIONS)}")

    movement = AssetMovement(
        asset_id=asset.id,
        event_type=event_type or f"CONDITION_{condition}",
        from_custody_type=asset.custody_type,
        from_custody_id=asset.custody_id,
        to_custody_type=asset.custody_type,
        to_custody_id=asset.custody_id,
        from_condition=asset.condition,
        to_condition=condition,
        quantity=1,
        reason=reason,
        source_type=source_type,
        source_id=source_id,
        performed_by=user_id,
    )
    db.add(movement)
    asset.condition = condition

    if commit:
        await db.commit()
        await db.refresh(asset)
    else:
        await db.flush()
    return movement


def is_available(asset: Asset) -> bool:
    """Derived, never stored: in a stock location and in working order."""
    return asset.custody_type == CUSTODY_LOCATION and asset.condition == "OK"


async def default_location_id(db: AsyncSession):
    """Where a returned item goes when nothing more specific is said."""
    return (
        await db.execute(
            select(StockLocation.id)
            .where(StockLocation.deleted_at.is_(None))
            .order_by(StockLocation.is_default.desc(), StockLocation.sort_order)
            .limit(1)
        )
    ).scalar_one_or_none()


async def list_movements(db: AsyncSession, asset_id: UUID, limit: int = 200) -> list[dict]:
    """One item's whole history, newest first, with both ends named."""
    rows = (
        await db.execute(
            select(AssetMovement)
            .where(AssetMovement.asset_id == asset_id)
            .order_by(AssetMovement.occurred_at.desc(), AssetMovement.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()

    out = []
    for m in rows:
        item = {c.name: getattr(m, c.name) for c in m.__table__.columns}
        item["from_label"] = await holder_label(db, m.from_custody_type, m.from_custody_id)
        item["to_label"] = await holder_label(db, m.to_custody_type, m.to_custody_id)
        out.append(item)
    return out


async def custody_summary(db: AsyncSession) -> dict:
    """Counts the Inventory Manager opens the module to see."""
    by_custody = dict(
        (
            await db.execute(
                select(Asset.custody_type, func.count())
                .where(Asset.deleted_at.is_(None))
                .group_by(Asset.custody_type)
            )
        ).all()
    )
    by_condition = dict(
        (
            await db.execute(
                select(Asset.condition, func.count())
                .where(Asset.deleted_at.is_(None))
                .group_by(Asset.condition)
            )
        ).all()
    )
    by_location = [
        {"location": name, "count": count}
        for name, count in (
            await db.execute(
                select(StockLocation.name, func.count(Asset.id))
                .select_from(StockLocation)
                .outerjoin(
                    Asset,
                    (Asset.custody_id == StockLocation.id)
                    & (Asset.custody_type == "LOCATION")
                    & (Asset.deleted_at.is_(None)),
                )
                .where(StockLocation.deleted_at.is_(None))
                .group_by(StockLocation.id, StockLocation.name, StockLocation.sort_order)
                .order_by(StockLocation.sort_order)
            )
        ).all()
    ]
    total = (
        await db.execute(
            select(func.count()).select_from(Asset).where(Asset.deleted_at.is_(None))
        )
    ).scalar_one()
    available = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.deleted_at.is_(None),
                Asset.custody_type == CUSTODY_LOCATION,
                Asset.condition == "OK",
            )
        )
    ).scalar_one()
    overdue = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.deleted_at.is_(None),
                Asset.expected_return_date.isnot(None),
                Asset.expected_return_date < func.now(),
                Asset.custody_type != CUSTODY_LOCATION,
            )
        )
    ).scalar_one()

    return {
        "total": total,
        "available": available,
        "overdue": overdue,
        "needs_reconciliation": by_custody.get("UNKNOWN", 0),
        "by_custody": by_custody,
        "by_condition": by_condition,
        "by_location": by_location,
    }


# --- places and parties -----------------------------------------------------

_PARTY_MODELS = {"customers": Customer, "vendors": Vendor}


async def list_locations(db: AsyncSession) -> list[StockLocation]:
    return list(
        (
            await db.execute(
                select(StockLocation)
                .where(StockLocation.deleted_at.is_(None))
                .order_by(StockLocation.sort_order, StockLocation.name)
            )
        ).scalars().all()
    )


async def create_location(db: AsyncSession, body, user_id: UUID) -> StockLocation:
    existing = (
        await db.execute(select(StockLocation).where(StockLocation.name == body.name))
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(f"A location named {body.name!r} already exists")
    loc = StockLocation(**body.model_dump(exclude_unset=True))
    db.add(loc)
    await record_audit(
        db, action="CREATE", entity_type="stock_location",
        entity_id=loc.id, user_id=user_id, new_values={"name": body.name},
    )
    await db.commit()
    await db.refresh(loc)
    return loc


async def delete_location(db: AsyncSession, location_id: UUID, user_id: UUID) -> None:
    loc = (
        await db.execute(
            select(StockLocation).where(
                StockLocation.id == location_id, StockLocation.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not loc:
        raise NotFoundException("Location not found")

    held = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.custody_type == "LOCATION",
                Asset.custody_id == location_id,
                Asset.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if held:
        raise ConflictException(
            f"{held} item(s) are still here. Move them somewhere else first — "
            "deleting the place would leave them holding a reference to nothing."
        )

    from datetime import timezone

    loc.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db, action="DELETE", entity_type="stock_location",
        entity_id=loc.id, user_id=user_id,
    )
    await db.commit()


async def list_parties(db: AsyncSession, kind: str):
    model = _PARTY_MODELS[kind]
    return list(
        (
            await db.execute(
                select(model).where(model.deleted_at.is_(None)).order_by(model.name)
            )
        ).scalars().all()
    )


async def create_party(db: AsyncSession, kind: str, body, user_id: UUID):
    model = _PARTY_MODELS[kind]
    existing = (
        await db.execute(select(model).where(model.name == body.name))
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(f"{body.name!r} already exists")
    row = model(**body.model_dump(exclude_unset=True))
    db.add(row)
    await record_audit(
        db, action="CREATE", entity_type=kind[:-1],
        entity_id=row.id, user_id=user_id, new_values={"name": body.name},
    )
    await db.commit()
    await db.refresh(row)
    return row


async def enrich(db: AsyncSession, assets) -> None:
    """Fill the two derived fields the ORM cannot: who holds it, and whether
    it is available.

    Holder names live in five different tables, so they are looked up in one
    batch per custody type rather than per asset — a 50-row inventory page was
    otherwise 50 queries.
    """
    from sqlalchemy import text

    items = list(assets)
    if not items:
        return

    wanted: dict[str, set] = {}
    for a in items:
        if a.custody_id and a.custody_type in _HOLDER_TABLES:
            wanted.setdefault(a.custody_type, set()).add(str(a.custody_id))

    labels: dict[str, str] = {}
    for custody_type, ids in wanted.items():
        table, column = _HOLDER_TABLES[custody_type]
        rows = (
            await db.execute(
                text(f"SELECT id, {column} FROM {table} WHERE id = ANY(:ids)"),
                {"ids": list(ids)},
            )
        ).all()
        for row_id, label in rows:
            labels[str(row_id)] = label

    for a in items:
        a.custody_label = labels.get(str(a.custody_id)) if a.custody_id else None
        a.is_available = is_available(a)
