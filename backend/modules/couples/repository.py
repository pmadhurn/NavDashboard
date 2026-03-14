from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import Couple


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Couple]:
    stmt = select(Couple).where(Couple.id == id, Couple.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Couple]:
    stmt = select(Couple).where(Couple.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Couple, filters)
    stmt = stmt.order_by(Couple.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: dict) -> Couple:
    couple = Couple(**obj_in)
    db.add(couple)
    await db.flush()
    await db.refresh(couple)
    return couple


async def update(
    db: AsyncSession, id: UUID, obj_in: dict
) -> Optional[Couple]:
    couple = await get_by_id(db, id)
    if not couple:
        return None
    for field, value in obj_in.items():
        setattr(couple, field, value)
    couple.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(couple)
    return couple


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Couple]:
    couple = await get_by_id(db, id)
    if not couple:
        return None
    couple.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(couple)
    return couple


async def get_by_pair_id(db: AsyncSession, pair_id: UUID) -> list[Couple]:
    stmt = select(Couple).where(
        Couple.pair_id == pair_id, Couple.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_map_data(db: AsyncSession) -> list[dict]:
    from modules.locations.models import Location

    stmt = (
        select(
            Couple.id,
            Couple.name,
            Location.latitude,
            Location.longitude,
            Couple.status,
            Couple.has_rf,
        )
        .join(Location, Couple.location_id == Location.id)
        .where(Couple.deleted_at.is_(None))
        .where(Couple.location_id.isnot(None))
    )
    result = await db.execute(stmt)
    return [
        {
            "couple_id": row[0],
            "couple_name": row[1],
            "latitude": row[2],
            "longitude": row[3],
            "status": row[4],
            "has_rf": row[5],
        }
        for row in result.all()
    ]


async def count_all(db: AsyncSession) -> int:
    stmt = (
        select(func.count())
        .select_from(Couple)
        .where(Couple.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    return result.scalar_one()
