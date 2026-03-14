from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import Location, LocationHistory
from .schemas import LocationCreate, LocationUpdate


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Location]:
    stmt = select(Location).where(Location.id == id, Location.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Location]:
    stmt = select(Location).where(Location.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Location, filters)
    stmt = stmt.order_by(Location.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: LocationCreate) -> Location:
    location = Location(
        latitude=obj_in.latitude,
        longitude=obj_in.longitude,
        address_note=obj_in.address_note,
        coordinate=WKTElement(
            f"POINT({obj_in.longitude} {obj_in.latitude})", srid=4326
        ),
    )
    db.add(location)
    await db.flush()
    await db.refresh(location)
    return location


async def update(
    db: AsyncSession, id: UUID, obj_in: LocationUpdate
) -> Optional[Location]:
    location = await get_by_id(db, id)
    if not location:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    new_lat = obj_in.latitude if obj_in.latitude is not None else location.latitude
    new_lng = obj_in.longitude if obj_in.longitude is not None else location.longitude
    location.coordinate = WKTElement(
        f"POINT({new_lng} {new_lat})", srid=4326
    )
    location.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(location)
    return location


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Location]:
    location = await get_by_id(db, id)
    if not location:
        return None
    location.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(location)
    return location


async def create_history(db: AsyncSession, history: LocationHistory) -> LocationHistory:
    db.add(history)
    await db.flush()
    await db.refresh(history)
    return history


async def get_history_by_couple(
    db: AsyncSession, couple_id: UUID, skip: int = 0, limit: int = 50
) -> list[LocationHistory]:
    stmt = (
        select(LocationHistory)
        .where(LocationHistory.couple_id == couple_id)
        .order_by(LocationHistory.moved_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_all_history(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[LocationHistory]:
    stmt = select(LocationHistory)
    if filters:
        stmt = apply_filters(stmt, LocationHistory, filters)
    stmt = stmt.order_by(LocationHistory.moved_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())