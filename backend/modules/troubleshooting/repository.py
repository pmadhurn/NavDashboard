from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import ErrorLog, TroubleshootEntry
from .schemas import ErrorLogCreate, ErrorLogUpdate, TroubleshootEntryCreate, TroubleshootEntryUpdate


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[ErrorLog]:
    stmt = select(ErrorLog).where(ErrorLog.id == id, ErrorLog.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[ErrorLog]:
    stmt = select(ErrorLog).where(ErrorLog.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, ErrorLog, filters)
    stmt = stmt.order_by(ErrorLog.reported_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_filtered(db: AsyncSession, filters: dict | None = None) -> int:
    stmt = select(ErrorLog).where(ErrorLog.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, ErrorLog, filters)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    result = await db.execute(count_stmt)
    return result.scalar_one()


async def create(db: AsyncSession, obj_in: ErrorLogCreate) -> ErrorLog:
    error = ErrorLog(
        device_id=obj_in.device_id,
        couple_id=obj_in.couple_id,
        pair_id=obj_in.pair_id,
        error_type=obj_in.error_type,
        severity=obj_in.severity,
        description=obj_in.description,
        reported_by=obj_in.reported_by,
        custom_fields=obj_in.custom_fields,
    )
    db.add(error)
    await db.flush()
    await db.refresh(error)
    return error


async def update(db: AsyncSession, id: UUID, obj_in: ErrorLogUpdate) -> Optional[ErrorLog]:
    error = await get_by_id(db, id)
    if not error:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(error, field, value)
    error.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(error)
    return error


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[ErrorLog]:
    error = await get_by_id(db, id)
    if not error:
        return None
    error.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(error)
    return error


async def get_by_device(db: AsyncSession, device_id: UUID) -> list[ErrorLog]:
    stmt = (
        select(ErrorLog)
        .where(ErrorLog.device_id == device_id, ErrorLog.deleted_at.is_(None))
        .order_by(ErrorLog.reported_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_couple(db: AsyncSession, couple_id: UUID) -> list[ErrorLog]:
    stmt = (
        select(ErrorLog)
        .where(ErrorLog.couple_id == couple_id, ErrorLog.deleted_at.is_(None))
        .order_by(ErrorLog.reported_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_by_pair(db: AsyncSession, pair_id: UUID) -> list[ErrorLog]:
    stmt = (
        select(ErrorLog)
        .where(ErrorLog.pair_id == pair_id, ErrorLog.deleted_at.is_(None))
        .order_by(ErrorLog.reported_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_steps(db: AsyncSession, error_id: UUID) -> list[TroubleshootEntry]:
    stmt = (
        select(TroubleshootEntry)
        .where(TroubleshootEntry.error_id == error_id)
        .order_by(TroubleshootEntry.step_number.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_steps(db: AsyncSession, error_id: UUID) -> int:
    stmt = select(func.count()).select_from(
        select(TroubleshootEntry).where(TroubleshootEntry.error_id == error_id).subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def create_step(
    db: AsyncSession,
    error_id: UUID,
    step_in: TroubleshootEntryCreate,
    step_number: int,
) -> TroubleshootEntry:
    entry = TroubleshootEntry(
        error_id=error_id,
        step_number=step_number,
        step_description=step_in.step_description,
        action_taken=step_in.action_taken,
        resolution=step_in.resolution,
        performed_by=step_in.performed_by,
        custom_fields=step_in.custom_fields,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def update_step(
    db: AsyncSession,
    step_id: UUID,
    step_in: TroubleshootEntryUpdate,
) -> Optional[TroubleshootEntry]:
    stmt = select(TroubleshootEntry).where(TroubleshootEntry.id == step_id)
    result = await db.execute(stmt)
    step = result.scalar_one_or_none()
    if not step:
        return None
    update_data = step_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(step, field, value)
    await db.flush()
    await db.refresh(step)
    return step


async def get_step_by_id(db: AsyncSession, step_id: UUID) -> Optional[TroubleshootEntry]:
    stmt = select(TroubleshootEntry).where(TroubleshootEntry.id == step_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_stats(db: AsyncSession) -> dict:
    base = select(ErrorLog).where(ErrorLog.deleted_at.is_(None))

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar_one()

    open_result = await db.execute(
        select(func.count()).select_from(
            select(ErrorLog)
            .where(ErrorLog.deleted_at.is_(None), ErrorLog.resolved == False)  # noqa: E712
            .subquery()
        )
    )
    open_count = open_result.scalar_one()

    resolved_count = total - open_count

    sev_result = await db.execute(
        select(ErrorLog.severity, func.count())
        .where(ErrorLog.deleted_at.is_(None))
        .group_by(ErrorLog.severity)
    )
    by_severity = {row[0]: row[1] for row in sev_result.all()}

    type_result = await db.execute(
        select(ErrorLog.error_type, func.count())
        .where(ErrorLog.deleted_at.is_(None))
        .group_by(ErrorLog.error_type)
    )
    by_type = {row[0]: row[1] for row in type_result.all()}

    return {
        "total": total,
        "open": open_count,
        "resolved": resolved_count,
        "by_severity": by_severity,
        "by_type": by_type,
    }


async def count_open(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(
        select(ErrorLog)
        .where(ErrorLog.deleted_at.is_(None), ErrorLog.resolved == False)  # noqa: E712
        .subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(
        select(ErrorLog).where(ErrorLog.deleted_at.is_(None)).subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()