from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import StatusChangeLog


async def create_log(db: AsyncSession, log: StatusChangeLog) -> StatusChangeLog:
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_history(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    skip: int = 0,
    limit: int = 50,
) -> list[StatusChangeLog]:
    stmt = (
        select(StatusChangeLog)
        .where(
            StatusChangeLog.entity_type == entity_type,
            StatusChangeLog.entity_id == entity_id,
        )
        .order_by(StatusChangeLog.changed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_history(
    db: AsyncSession, entity_type: str, entity_id: UUID
) -> int:
    stmt = select(func.count()).select_from(
        select(StatusChangeLog)
        .where(
            StatusChangeLog.entity_type == entity_type,
            StatusChangeLog.entity_id == entity_id,
        )
        .subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_all(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[StatusChangeLog]:
    stmt = select(StatusChangeLog).order_by(StatusChangeLog.changed_at.desc())
    if filters:
        if "entity_type" in filters:
            stmt = stmt.where(StatusChangeLog.entity_type == filters["entity_type"])
        if "entity_id" in filters:
            stmt = stmt.where(StatusChangeLog.entity_id == filters["entity_id"])
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_stats(db: AsyncSession) -> dict:
    result: dict[str, dict[str, int]] = {}
    for entity_type in ("device", "couple", "pair"):
        stmt = (
            select(StatusChangeLog.new_status, func.count())
            .where(StatusChangeLog.entity_type == entity_type)
            .group_by(StatusChangeLog.new_status)
        )
        rows = await db.execute(stmt)
        result[entity_type] = {row[0]: row[1] for row in rows.all()}
    return result


