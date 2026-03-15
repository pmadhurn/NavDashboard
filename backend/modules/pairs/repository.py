from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import Pair


async def get_by_id(db: AsyncSession, pair_id: UUID) -> Optional[Pair]:
    stmt = select(Pair).where(Pair.id == pair_id, Pair.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Pair]:
    stmt = select(Pair).where(Pair.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Pair, filters)
    stmt = stmt.order_by(Pair.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: dict) -> Pair:
    pair = Pair(**obj_in)
    db.add(pair)
    await db.flush()
    await db.refresh(pair)
    return pair


async def update(db: AsyncSession, pair_id: UUID, obj_in: dict) -> Optional[Pair]:
    pair = await get_by_id(db, pair_id)
    if not pair:
        return None
    for key, value in obj_in.items():
        setattr(pair, key, value)
    await db.flush()
    await db.refresh(pair)
    return pair


async def soft_delete(db: AsyncSession, pair_id: UUID) -> Optional[Pair]:
    pair = await get_by_id(db, pair_id)
    if not pair:
        return None
    pair.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(pair)
    return pair


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Pair).where(Pair.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_stats(db: AsyncSession) -> dict:
    total = await count_all(db)
    stmt = (
        select(Pair.status, func.count())
        .where(Pair.deleted_at.is_(None))
        .group_by(Pair.status)
    )
    result = await db.execute(stmt)
    by_status = {row[0]: row[1] for row in result.all()}
    return {"total": total, "by_status": by_status}