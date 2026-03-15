from __future__ import annotations

import logging
from datetime import datetime, timezone
from math import ceil
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, NotFoundException
from shared.audit import record_audit
from shared.pagination import PaginatedResponse, PaginationParams

from modules.devices.models import Device, DeviceStatusHistory
from modules.devices import repository as device_repo
from modules.couples.models import Couple
from modules.couples import repository as couple_repo
from modules.pairs.models import Pair
from modules.pairs import repository as pair_repo

from . import repository as repo
from .models import StatusChangeLog
from .schemas import StatusChangeLogResponse, StatusChangeRequest, StatusStatsResponse

logger = logging.getLogger(__name__)


async def change_status(
    db: AsyncSession, request: StatusChangeRequest, user_id: UUID
) -> StatusChangeLogResponse:
    # 1. Fetch entity
    if request.entity_type == "device":
        entity = await device_repo.get_by_id(db, request.entity_id)
    elif request.entity_type == "couple":
        entity = await couple_repo.get_by_id(db, request.entity_id)
    elif request.entity_type == "pair":
        entity = await pair_repo.get_by_id(db, request.entity_id)
    else:
        raise BadRequestException(f"Invalid entity type: {request.entity_type}")

    if not entity:
        raise NotFoundException(
            f"{request.entity_type.capitalize()} not found: {request.entity_id}"
        )

    # 2. Check if status actually changed
    old_status = entity.status
    if old_status == request.new_status:
        raise BadRequestException("Status unchanged")

    # 3. Update entity status
    entity.status = request.new_status
    entity.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(entity)

    # 4. Create StatusChangeLog
    log = StatusChangeLog(
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        old_status=old_status,
        new_status=request.new_status,
        changed_by=user_id,
        reason=request.reason,
    )
    log = await repo.create_log(db, log)

    # 5. Device-specific: also create DeviceStatusHistory
    if request.entity_type == "device":
        history = DeviceStatusHistory(
            device_id=request.entity_id,
            old_status=old_status,
            new_status=request.new_status,
            changed_by=user_id,
            reason=request.reason,
        )
        db.add(history)
        await db.flush()

    # 6. Couple-specific: recalculate pair status if couple belongs to a pair
    if request.entity_type == "couple" and entity.pair_id:
        await _recalculate_pair_status(db, entity.pair_id, user_id)

    # 7. Record audit
    await record_audit(
        db,
        action="STATUS_CHANGE",
        entity_type=request.entity_type,
        entity_id=request.entity_id,
        user_id=user_id,
        old_values={"status": old_status},
        new_values={"status": request.new_status, "reason": request.reason},
    )

    return StatusChangeLogResponse.model_validate(log, from_attributes=True)


async def _recalculate_pair_status(
    db: AsyncSession, pair_id: UUID, user_id: UUID
) -> None:
    """Business Rule #12: Auto-derive pair status from its couples."""
    pair = await pair_repo.get_by_id(db, pair_id)
    if not pair or pair.status_override:
        return

    couples = await couple_repo.get_by_pair_id(db, pair_id)
    if not couples:
        return

    statuses = [c.status for c in couples]

    if all(s == "WORKING" for s in statuses):
        new_status = "WORKING"
    elif any(s == "FAULTY" for s in statuses):
        new_status = "FAULTY"
    else:
        new_status = "NOT_WORKING"

    if pair.status != new_status:
        old_status = pair.status
        pair.status = new_status
        pair.updated_at = datetime.now(timezone.utc)
        await db.flush()

        pair_log = StatusChangeLog(
            entity_type="pair",
            entity_id=pair_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=user_id,
            reason="Auto-derived from couple status change",
        )
        await repo.create_log(db, pair_log)

        await record_audit(
            db,
            action="STATUS_CHANGE_AUTO",
            entity_type="pair",
            entity_id=pair_id,
            user_id=user_id,
            old_values={"status": old_status},
            new_values={"status": new_status},
        )


async def get_status_history(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    params: PaginationParams,
) -> PaginatedResponse[StatusChangeLogResponse]:
    total = await repo.count_history(db, entity_type, entity_id)
    offset = (params.page - 1) * params.size
    logs = await repo.get_history(db, entity_type, entity_id, skip=offset, limit=params.size)
    items = [
        StatusChangeLogResponse.model_validate(log, from_attributes=True)
        for log in logs
    ]
    pages = ceil(total / params.size) if params.size > 0 else 0
    return PaginatedResponse[StatusChangeLogResponse](
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )


async def get_status_stats(db: AsyncSession) -> StatusStatsResponse:
    # Get current entity status counts directly from source tables
    # Devices
    dev_stmt = (
        select(Device.status, func.count())
        .where(Device.deleted_at.is_(None))
        .group_by(Device.status)
    )
    dev_result = await db.execute(dev_stmt)
    devices = {row[0]: row[1] for row in dev_result.all()}

    # Couples
    cpl_stmt = (
        select(Couple.status, func.count())
        .where(Couple.deleted_at.is_(None))
        .group_by(Couple.status)
    )
    cpl_result = await db.execute(cpl_stmt)
    couples = {row[0]: row[1] for row in cpl_result.all()}

    # Pairs
    pr_stmt = (
        select(Pair.status, func.count())
        .where(Pair.deleted_at.is_(None))
        .group_by(Pair.status)
    )
    pr_result = await db.execute(pr_stmt)
    pairs = {row[0]: row[1] for row in pr_result.all()}

    return StatusStatsResponse(devices=devices, couples=couples, pairs=pairs)