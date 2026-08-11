from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ConflictException, NotFoundException
from modules.devices import repository
from modules.devices.constants import STATUS_COLORS, DeviceStatus
from modules.devices.models import Device, DeviceStatusHistory
from modules.devices.schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceStatsResponse,
    DeviceStatusHistoryResponse,
    DeviceUpdate,
)
from shared.audit import record_audit
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams, paginate
from shared.propagation import propagate_device_status_change


import logging

logger = logging.getLogger(__name__)


def _to_response(device: Device) -> DeviceResponse:
    return DeviceResponse.model_validate(device, from_attributes=True)


async def attach_custody(db: AsyncSession, responses) -> None:
    """Fill each device's custody from its linked asset.

    One physical thing, one answer. Reading it here rather than duplicating
    custody onto `devices` is what stops the two systems disagreeing.
    """
    from modules.assets import custody_service
    from modules.assets.models import Asset

    items = list(responses)
    ids = [r.id for r in items]
    if not ids:
        return

    rows = (
        await db.execute(
            select(Asset).where(Asset.device_id.in_(ids), Asset.deleted_at.is_(None))
        )
    ).scalars().all()
    await custody_service.enrich(db, rows)
    by_device = {str(a.device_id): a for a in rows}

    for r in items:
        a = by_device.get(str(r.id))
        if not a:
            continue
        r.asset_id = a.id
        r.asset_code = a.asset_code
        r.custody_type = a.custody_type
        r.custody_label = getattr(a, "custody_label", None)
        r.condition = a.condition
        r.is_available = getattr(a, "is_available", None)


async def _mirror_device_asset(db: AsyncSession, device: Device | None) -> None:
    """Best-effort: keep the unified-inventory mirror asset in sync. Never let a
    mirror failure break a device operation."""
    if device is None:
        return
    try:
        from modules.assets.service import sync_device_asset

        await sync_device_asset(db, device)
    except Exception as exc:
        logger.warning("Device→asset mirror failed for %s: %s", device.id, exc)


async def list_devices(
    db: AsyncSession,
    params: PaginationParams,
    filters: dict | None = None,
) -> PaginatedResponse[DeviceResponse]:
    query = select(Device).where(Device.deleted_at.is_(None))
    if filters:
        query = apply_filters(query, Device, filters)
    query = query.order_by(Device.created_at.desc())
    page = await paginate(db, query, params, DeviceResponse)
    await attach_custody(db, page.items)
    return page


async def get_device(db: AsyncSession, device_id: UUID) -> DeviceResponse:
    device = await repository.get_by_id(db, device_id)
    if not device:
        raise NotFoundException("Device not found")
    response = _to_response(device)
    await attach_custody(db, [response])
    return response


async def create_device(
    db: AsyncSession, device_in: DeviceCreate, user_id: UUID
) -> DeviceResponse:
    existing = await repository.find_by_serial(db, device_in.serial_number)
    if existing:
        raise ConflictException(
            f"Device with serial number '{device_in.serial_number}' already exists"
        )
    device = await repository.create(db, device_in)
    await record_audit(
        db,
        action="CREATE",
        entity_type="device",
        entity_id=device.id,
        user_id=user_id,
        new_values={"serial_number": device.serial_number, "device_type": device.device_type},
    )
    await _mirror_device_asset(db, device)
    return _to_response(device)


async def update_device(
    db: AsyncSession, device_id: UUID, device_in: DeviceUpdate, user_id: UUID
) -> DeviceResponse:
    device = await repository.get_by_id(db, device_id)
    if not device:
        raise NotFoundException("Device not found")

    if device_in.serial_number and device_in.serial_number != device.serial_number:
        existing = await repository.find_by_serial(db, device_in.serial_number)
        if existing:
            raise ConflictException(
                f"Device with serial number '{device_in.serial_number}' already exists"
            )

    old_values = {"serial_number": device.serial_number, "status": device.status}

    # If status is changing, create history
    status_changed = device_in.status and device_in.status != device.status
    if status_changed:
        history_entry = DeviceStatusHistory(
            device_id=device.id,
            old_status=device.status,
            new_status=device_in.status,
            changed_by=user_id,
            reason=None,
        )
        await repository.create_status_history(db, history_entry)

    updated = await repository.update(db, device_id, device_in)
    if not updated:
        raise NotFoundException("Device not found")

    # Cascade status to couple → pair
    if status_changed:
        await propagate_device_status_change(db, updated)

    await record_audit(
        db,
        action="UPDATE",
        entity_type="device",
        entity_id=device_id,
        user_id=user_id,
        old_values=old_values,
        new_values=device_in.model_dump(exclude_unset=True),
    )
    await _mirror_device_asset(db, updated)
    return _to_response(updated)


async def delete_device(
    db: AsyncSession, device_id: UUID, user_id: UUID
) -> DeviceResponse:
    device = await repository.get_by_id(db, device_id)
    if not device:
        raise NotFoundException("Device not found")
    deleted = await repository.soft_delete(db, device_id)
    await record_audit(
        db,
        action="DELETE",
        entity_type="device",
        entity_id=device_id,
        user_id=user_id,
        old_values={"serial_number": device.serial_number},
    )
    await _mirror_device_asset(db, deleted)
    return _to_response(deleted)


async def change_device_status(
    db: AsyncSession,
    device_id: UUID,
    status: str,
    reason: str | None,
    user_id: UUID,
) -> DeviceResponse:
    device = await repository.get_by_id(db, device_id)
    if not device:
        raise NotFoundException("Device not found")

    old_status = device.status

    history_entry = DeviceStatusHistory(
        device_id=device.id,
        old_status=old_status,
        new_status=status,
        changed_by=user_id,
        reason=reason,
    )
    await repository.create_status_history(db, history_entry)

    updated = await repository.update(db, device_id, DeviceUpdate(status=status))
    if not updated:
        raise NotFoundException("Device not found")

    # Cascade status to couple → pair
    await propagate_device_status_change(db, updated)

    await record_audit(
        db,
        action="STATUS_CHANGE",
        entity_type="device",
        entity_id=device_id,
        user_id=user_id,
        old_values={"status": old_status},
        new_values={"status": status, "reason": reason},
    )
    return _to_response(updated)


async def get_device_status_history(
    db: AsyncSession, device_id: UUID
) -> list[DeviceStatusHistoryResponse]:
    entries = await repository.get_status_history(db, device_id)
    return [
        DeviceStatusHistoryResponse.model_validate(e, from_attributes=True)
        for e in entries
    ]


async def get_device_stats(db: AsyncSession) -> DeviceStatsResponse:
    stats = await repository.get_stats(db)
    return DeviceStatsResponse(**stats)


async def seed_devices(
    db: AsyncSession, user_id: UUID
) -> list[DeviceResponse]:
    count = await repository.count_all(db)
    if count > 0:
        return []

    seed_data = [
        ("IU-00001", "IU", "WORKING"),
        ("IU-00002", "IU", "WORKING"),
        ("OU-00001", "OU", "WORKING"),
        ("OU-00002", "OU", "NOT_WORKING"),
        ("HC-00001", "HC", "WORKING"),
        ("HC-00002", "HC", "WORKING"),
        ("RF-00001", "RF", "WORKING"),
        ("RF-00002", "RF", "FAULTY"),
        ("IU-00003", "IU", "FAULTY"),
        ("OU-00003", "OU", "WORKING"),
    ]

    results = []
    for serial, dtype, status in seed_data:
        device_in = DeviceCreate(
            serial_number=serial, device_type=dtype, status=status
        )
        device = await repository.create(db, device_in)
        await record_audit(
            db,
            action="CREATE",
            entity_type="device",
            entity_id=device.id,
            user_id=user_id,
            new_values={"serial_number": serial, "device_type": dtype, "seed": True},
        )
        results.append(_to_response(device))
    return results