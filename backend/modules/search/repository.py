from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from uuid import UUID
from typing import Optional

from modules.devices.models import Device
from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.personnel.models import Person
from modules.troubleshooting.models import ErrorLog
from modules.search.indexer import build_ilike_conditions


async def search_devices(
    db: AsyncSession,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
) -> list[dict]:
    from sqlalchemy import cast, String as SAString

    conditions = build_ilike_conditions(Device, ["serial_number", "notes"], query)
    # Also search inside JSONB custom_fields by casting to text
    if Device.custom_fields is not None:
        pattern = f"%{query}%"
        conditions.append(cast(Device.custom_fields, SAString).ilike(pattern))

    if not conditions:
        return []

    stmt = select(Device).where(
        and_(
            Device.deleted_at.is_(None),
            or_(*conditions),
        )
    )

    if filters:
        if filters.get("status"):
            stmt = stmt.where(Device.status == filters["status"])
        if filters.get("device_type"):
            stmt = stmt.where(Device.device_type == filters["device_type"])
        if filters.get("handling_person_id"):
            stmt = stmt.where(Device.handling_person_id == filters["handling_person_id"])

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": "device",
            "name": row.serial_number,
            "description": row.notes,
            "status": row.status,
            "extra": {
                "device_type": row.device_type,
                "custom_fields": row.custom_fields,
            },
        }
        for row in rows
    ]


async def search_couples(
    db: AsyncSession,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
) -> list[dict]:
    conditions = build_ilike_conditions(Couple, ["name", "notes"], query)
    if not conditions:
        return []

    stmt = select(Couple).where(
        and_(
            Couple.deleted_at.is_(None),
            or_(*conditions),
        )
    )

    if filters:
        if filters.get("status"):
            stmt = stmt.where(Couple.status == filters["status"])

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": "couple",
            "name": row.name,
            "description": row.notes,
            "status": row.status,
            "extra": {"has_rf": row.has_rf},
        }
        for row in rows
    ]


async def search_pairs(
    db: AsyncSession,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
) -> list[dict]:
    conditions = build_ilike_conditions(Pair, ["name", "notes"], query)
    if not conditions:
        return []

    stmt = select(Pair).where(
        and_(
            Pair.deleted_at.is_(None),
            or_(*conditions),
        )
    )

    if filters:
        if filters.get("status"):
            stmt = stmt.where(Pair.status == filters["status"])

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": "pair",
            "name": row.name,
            "description": row.notes,
            "status": row.status,
            "extra": {},
        }
        for row in rows
    ]


async def search_personnel(
    db: AsyncSession,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
) -> list[dict]:
    conditions = build_ilike_conditions(Person, ["full_name", "email", "notes"], query)
    if not conditions:
        return []

    stmt = select(Person).where(
        and_(
            Person.deleted_at.is_(None),
            or_(*conditions),
        )
    )

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": "personnel",
            "name": row.full_name,
            "description": row.notes,
            "status": None,
            "extra": {"email": row.email, "role": row.role},
        }
        for row in rows
    ]


async def search_errors(
    db: AsyncSession,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
) -> list[dict]:
    conditions = build_ilike_conditions(ErrorLog, ["error_type", "description"], query)
    if not conditions:
        return []

    stmt = select(ErrorLog).where(
        and_(
            ErrorLog.deleted_at.is_(None),
            or_(*conditions),
        )
    )

    if filters:
        if filters.get("severity"):
            stmt = stmt.where(ErrorLog.severity == filters["severity"])
        if filters.get("date_from"):
            stmt = stmt.where(ErrorLog.reported_at >= filters["date_from"])
        if filters.get("date_to"):
            stmt = stmt.where(ErrorLog.reported_at <= filters["date_to"])

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        {
            "id": row.id,
            "entity_type": "error",
            "name": row.error_type,
            "description": row.description,
            "status": "RESOLVED" if row.resolved else "OPEN",
            "extra": {"severity": row.severity},
        }
        for row in rows
    ]