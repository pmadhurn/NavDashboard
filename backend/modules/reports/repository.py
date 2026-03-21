from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.couples.models import Couple
from modules.devices.models import Device
from modules.locations.models import LocationHistory
from modules.pairs.models import Pair
from modules.troubleshooting.models import ErrorLog


async def get_devices_for_report(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> list[Device]:
    stmt = select(Device).where(Device.deleted_at.is_(None))
    if date_from:
        stmt = stmt.where(Device.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Device.created_at <= date_to)
    if entity_ids:
        stmt = stmt.where(Device.id.in_(entity_ids))
    stmt = stmt.order_by(Device.serial_number)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_errors_for_report(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> list[ErrorLog]:
    stmt = select(ErrorLog).where(ErrorLog.deleted_at.is_(None))
    if date_from:
        stmt = stmt.where(ErrorLog.reported_at >= date_from)
    if date_to:
        stmt = stmt.where(ErrorLog.reported_at <= date_to)
    if entity_ids:
        stmt = stmt.where(ErrorLog.id.in_(entity_ids))
    stmt = stmt.order_by(ErrorLog.reported_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_location_history_for_report(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> list[LocationHistory]:
    stmt = select(LocationHistory).where(LocationHistory.deleted_at.is_(None))
    if date_from:
        stmt = stmt.where(LocationHistory.moved_at >= date_from)
    if date_to:
        stmt = stmt.where(LocationHistory.moved_at <= date_to)
    if entity_ids:
        stmt = stmt.where(LocationHistory.couple_id.in_(entity_ids))
    stmt = stmt.order_by(LocationHistory.moved_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_pairs_for_report(
    db: AsyncSession,
    entity_ids: Optional[list[UUID]] = None,
) -> list[Pair]:
    stmt = select(Pair).where(Pair.deleted_at.is_(None))
    if entity_ids:
        stmt = stmt.where(Pair.id.in_(entity_ids))
    stmt = stmt.order_by(Pair.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_couples_for_report(
    db: AsyncSession,
    entity_ids: Optional[list[UUID]] = None,
) -> list[Couple]:
    stmt = select(Couple).where(Couple.deleted_at.is_(None))
    if entity_ids:
        stmt = stmt.where(Couple.id.in_(entity_ids))
    stmt = stmt.order_by(Couple.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())