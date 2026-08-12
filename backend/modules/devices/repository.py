from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.devices.models import Device, DeviceStatusHistory
from modules.devices.schemas import DeviceCreate, DeviceUpdate
from shared.filters import apply_filters


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Device]:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: dict | None = None,
) -> list[Device]:
    stmt = select(Device).where(Device.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Device, filters)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: DeviceCreate) -> Device:
    device = Device(
        serial_number=obj_in.serial_number,
        device_type=obj_in.device_type,
        status=obj_in.status,
        couple_id=obj_in.couple_id,
        handling_person_id=obj_in.handling_person_id,
        device_model_id=obj_in.device_model_id,
        notes=obj_in.notes,
        custom_fields=obj_in.custom_fields,
        metadata_json=obj_in.metadata_json,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


async def update(db: AsyncSession, id: UUID, obj_in: DeviceUpdate) -> Device:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    if not device:
        return None  # type: ignore
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.flush()
    await db.refresh(device)
    return device


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Device]:
    stmt = select(Device).where(Device.id == id, Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    device = result.scalar_one_or_none()
    if not device:
        return None
    from datetime import datetime, timezone

    device.deleted_at = datetime.now(timezone.utc)
    device.couple_id = None
    await db.flush()
    await db.refresh(device)
    return device


async def find_by_serial(
    db: AsyncSession, serial_number: str, include_deleted: bool = False
) -> Optional[Device]:
    stmt = select(Device).where(Device.serial_number == serial_number)
    if not include_deleted:
        stmt = stmt.where(Device.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def search_by_serial(db: AsyncSession, query: str) -> list[Device]:
    stmt = select(Device).where(
        Device.serial_number.ilike(f"%{query}%"), Device.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_stats(db: AsyncSession) -> dict:
    base = select(Device).where(Device.deleted_at.is_(None))

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar_one()

    type_result = await db.execute(
        select(Device.device_type, func.count())
        .where(Device.deleted_at.is_(None))
        .group_by(Device.device_type)
    )
    by_type = {row[0]: row[1] for row in type_result.all()}

    status_result = await db.execute(
        select(Device.status, func.count())
        .where(Device.deleted_at.is_(None))
        .group_by(Device.status)
    )
    by_status = {row[0]: row[1] for row in status_result.all()}

    return {"total": total, "by_type": by_type, "by_status": by_status}


async def get_status_history(
    db: AsyncSession, device_id: UUID
) -> list[DeviceStatusHistory]:
    stmt = (
        select(DeviceStatusHistory)
        .where(DeviceStatusHistory.device_id == device_id)
        .order_by(DeviceStatusHistory.changed_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_status_history(
    db: AsyncSession, entry: DeviceStatusHistory
) -> DeviceStatusHistory:
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(
        select(Device).where(Device.deleted_at.is_(None)).subquery()
    )
    result = await db.execute(stmt)
    return result.scalar_one()