from __future__ import annotations

import logging
from datetime import datetime, timezone
from math import ceil
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, NotFoundException
from shared.audit import record_audit
from shared.pagination import PaginatedResponse, PaginationParams

from modules.personnel.models import Person
from modules.devices.models import Device
from modules.couples.models import Couple
from modules.pairs.models import Pair

from . import repository as repo
from .models import ErrorLog, TroubleshootEntry
from .schemas import (
    SEVERITY_COLORS,
    ErrorLogCreate,
    ErrorLogResponse,
    ErrorLogUpdate,
    ErrorStatsResponse,
    ResolveRequest,
    TroubleshootEntryCreate,
    TroubleshootEntryResponse,
    TroubleshootEntryUpdate,
)

logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────


async def _get_person_name(db: AsyncSession, person_id: Optional[UUID]) -> Optional[str]:
    if not person_id:
        return None
    stmt = select(Person).where(Person.id == person_id, Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    return person.full_name if person else None


async def _build_step_response(
    db: AsyncSession, step: TroubleshootEntry
) -> TroubleshootEntryResponse:
    performer_name = await _get_person_name(db, step.performed_by)
    return TroubleshootEntryResponse(
        id=step.id,
        error_id=step.error_id,
        step_number=step.step_number,
        step_description=step.step_description,
        action_taken=step.action_taken,
        resolution=step.resolution,
        performed_by=step.performed_by,
        performed_by_name=performer_name,
        performed_at=step.performed_at,
        custom_fields=step.custom_fields,
    )


async def _build_error_response(
    db: AsyncSession, error: ErrorLog, include_steps: bool = True
) -> ErrorLogResponse:
    steps_resp: list[TroubleshootEntryResponse] = []
    if include_steps:
        steps = await repo.get_steps(db, error.id)
        steps_resp = [await _build_step_response(db, s) for s in steps]

    reporter_name = await _get_person_name(db, error.reported_by)
    resolver_name = await _get_person_name(db, error.resolved_by)

    return ErrorLogResponse(
        id=error.id,
        device_id=error.device_id,
        couple_id=error.couple_id,
        pair_id=error.pair_id,
        error_type=error.error_type,
        severity=error.severity,
        severity_color=SEVERITY_COLORS.get(error.severity, "#6E6E6E"),
        description=error.description,
        reported_by=error.reported_by,
        reported_by_name=reporter_name,
        reported_at=error.reported_at,
        resolved=error.resolved,
        resolved_at=error.resolved_at,
        resolved_by=error.resolved_by,
        resolved_by_name=resolver_name,
        steps=steps_resp,
        custom_fields=error.custom_fields,
        created_at=error.created_at,
    )


# ── public API ───────────────────────────────────────────────────


async def list_errors(
    db: AsyncSession,
    params: PaginationParams,
    filters: dict | None = None,
) -> PaginatedResponse[ErrorLogResponse]:
    total = await repo.count_filtered(db, filters)
    offset = (params.page - 1) * params.size
    errors = await repo.get_multi(db, skip=offset, limit=params.size, filters=filters)
    items = [await _build_error_response(db, e, include_steps=False) for e in errors]
    pages = ceil(total / params.size) if params.size > 0 else 0
    return PaginatedResponse[ErrorLogResponse](
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )


async def get_error(db: AsyncSession, error_id: UUID) -> ErrorLogResponse:
    error = await repo.get_by_id(db, error_id)
    if not error:
        raise NotFoundException("Error log not found")
    return await _build_error_response(db, error, include_steps=True)


async def create_error(
    db: AsyncSession, error_in: ErrorLogCreate, user_id: UUID
) -> ErrorLogResponse:
    error = await repo.create(db, error_in)
    await record_audit(
        db,
        action="CREATE",
        entity_type="error_log",
        entity_id=error.id,
        user_id=user_id,
        new_values={
            "error_type": error.error_type,
            "severity": error.severity,
            "description": error.description,
        },
    )

    # Auto-set associated device to FAULTY and propagate to couple → pair
    if error_in.device_id:
        try:
            from shared.propagation import propagate_device_status_change

            device_stmt = select(Device).where(
                Device.id == error_in.device_id, Device.deleted_at.is_(None)
            )
            device_result = await db.execute(device_stmt)
            device = device_result.scalar_one_or_none()
            if device and device.status != "FAULTY":
                device.status = "FAULTY"
                device.updated_at = datetime.now(timezone.utc)
                await db.flush()
                await db.refresh(device)
                await propagate_device_status_change(db, device)
                logger.info(
                    "Device %s set to FAULTY via error log %s", device.id, error.id
                )
        except Exception as exc:
            logger.warning("Failed to propagate FAULTY status: %s", exc)

    return await _build_error_response(db, error, include_steps=True)


async def update_error(
    db: AsyncSession, error_id: UUID, error_in: ErrorLogUpdate, user_id: UUID
) -> ErrorLogResponse:
    existing = await repo.get_by_id(db, error_id)
    if not existing:
        raise NotFoundException("Error log not found")
    old_values = {
        "error_type": existing.error_type,
        "severity": existing.severity,
        "description": existing.description,
    }
    updated = await repo.update(db, error_id, error_in)
    if not updated:
        raise NotFoundException("Error log not found")
    await record_audit(
        db,
        action="UPDATE",
        entity_type="error_log",
        entity_id=updated.id,
        user_id=user_id,
        old_values=old_values,
        new_values=error_in.model_dump(exclude_unset=True),
    )
    return await _build_error_response(db, updated, include_steps=True)


async def delete_error(
    db: AsyncSession, error_id: UUID, user_id: UUID
) -> ErrorLogResponse:
    error = await repo.get_by_id(db, error_id)
    if not error:
        raise NotFoundException("Error log not found")
    response = await _build_error_response(db, error, include_steps=True)
    await repo.soft_delete(db, error_id)
    await record_audit(
        db,
        action="DELETE",
        entity_type="error_log",
        entity_id=error.id,
        user_id=user_id,
        old_values={"error_type": error.error_type, "severity": error.severity},
    )
    return response


async def add_step(
    db: AsyncSession,
    error_id: UUID,
    step_in: TroubleshootEntryCreate,
    user_id: UUID,
) -> TroubleshootEntryResponse:
    error = await repo.get_by_id(db, error_id)
    if not error:
        raise NotFoundException("Error log not found")
    if error.resolved:
        raise BadRequestException("Cannot add step to a resolved error")
    count = await repo.count_steps(db, error_id)
    step_number = count + 1
    step = await repo.create_step(db, error_id, step_in, step_number)
    await record_audit(
        db,
        action="ADD_STEP",
        entity_type="error_log",
        entity_id=error_id,
        user_id=user_id,
        new_values={
            "step_number": step_number,
            "step_description": step_in.step_description,
        },
    )
    return await _build_step_response(db, step)


async def update_step(
    db: AsyncSession,
    error_id: UUID,
    step_id: UUID,
    step_in: TroubleshootEntryUpdate,
    user_id: UUID,
) -> TroubleshootEntryResponse:
    error = await repo.get_by_id(db, error_id)
    if not error:
        raise NotFoundException("Error log not found")
    existing_step = await repo.get_step_by_id(db, step_id)
    if not existing_step or existing_step.error_id != error_id:
        raise NotFoundException("Troubleshoot step not found")
    updated = await repo.update_step(db, step_id, step_in)
    if not updated:
        raise NotFoundException("Troubleshoot step not found")
    await record_audit(
        db,
        action="UPDATE_STEP",
        entity_type="error_log",
        entity_id=error_id,
        user_id=user_id,
        new_values=step_in.model_dump(exclude_unset=True),
    )
    return await _build_step_response(db, updated)


async def resolve_error(
    db: AsyncSession,
    error_id: UUID,
    resolve_in: ResolveRequest,
    user_id: UUID,
) -> ErrorLogResponse:
    error = await repo.get_by_id(db, error_id)
    if not error:
        raise NotFoundException("Error log not found")
    if error.resolved:
        raise BadRequestException("Error is already resolved")

    now = datetime.now(timezone.utc)
    error.resolved = True
    error.resolved_at = now
    error.resolved_by = resolve_in.resolved_by or user_id
    error.updated_at = now
    await db.flush()
    await db.refresh(error)

    if resolve_in.resolution_notes:
        count = await repo.count_steps(db, error_id)
        step_in = TroubleshootEntryCreate(
            step_description="Resolution",
            action_taken=resolve_in.resolution_notes,
            resolution=resolve_in.resolution_notes,
            performed_by=resolve_in.resolved_by or user_id,
        )
        await repo.create_step(db, error_id, step_in, count + 1)

    await record_audit(
        db,
        action="RESOLVE",
        entity_type="error_log",
        entity_id=error_id,
        user_id=user_id,
        new_values={
            "resolved": True,
            "resolved_at": now.isoformat(),
            "resolution_notes": resolve_in.resolution_notes,
        },
    )
    return await _build_error_response(db, error, include_steps=True)


async def get_errors_by_entity(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    params: PaginationParams,
) -> PaginatedResponse[ErrorLogResponse]:
    if entity_type == "device":
        errors = await repo.get_by_device(db, entity_id)
    elif entity_type == "couple":
        errors = await repo.get_by_couple(db, entity_id)
    elif entity_type == "pair":
        errors = await repo.get_by_pair(db, entity_id)
    else:
        raise BadRequestException(f"Invalid entity type: {entity_type}")

    total = len(errors)
    offset = (params.page - 1) * params.size
    paged = errors[offset : offset + params.size]
    items = [await _build_error_response(db, e, include_steps=False) for e in paged]
    pages = ceil(total / params.size) if params.size > 0 else 0
    return PaginatedResponse[ErrorLogResponse](
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )


async def get_error_stats(db: AsyncSession) -> ErrorStatsResponse:
    stats = await repo.get_stats(db)
    return ErrorStatsResponse(**stats)


async def seed_errors(db: AsyncSession, user_id: UUID) -> list[ErrorLogResponse]:
    existing_count = await repo.count_all(db)
    if existing_count > 0:
        raise BadRequestException("Error logs already exist. Seed skipped.")

    # Look up devices by serial_number
    device_iu_001 = (
        await db.execute(
            select(Device).where(
                Device.serial_number == "IU-00001", Device.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()

    device_ou_002 = (
        await db.execute(
            select(Device).where(
                Device.serial_number == "OU-00002", Device.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()

    # Look up couples by name
    couple_a2 = (
        await db.execute(
            select(Couple).where(
                Couple.name.ilike("%A2%"), Couple.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()

    couple_b1 = (
        await db.execute(
            select(Couple).where(
                Couple.name.ilike("%B1%"), Couple.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()

    # Look up pairs by name
    pair_02 = (
        await db.execute(
            select(Pair).where(
                Pair.name.ilike("%02%"), Pair.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()

    # Look up personnel by name
    personnel = (
        await db.execute(
            select(Person).where(Person.deleted_at.is_(None))
        )
    ).scalars().all()

    person_map: dict[str, Person] = {}
    for p in personnel:
        name_lower = p.full_name.lower()
        if "ahmed" in name_lower:
            person_map["ahmed"] = p
        elif "maria" in name_lower:
            person_map["maria"] = p
        elif "fatima" in name_lower:
            person_map["fatima"] = p
        elif "lars" in name_lower:
            person_map["lars"] = p
        elif "james" in name_lower:
            person_map["james"] = p

    results: list[ErrorLogResponse] = []

    # ─── Error 1: Device IU-00001, Connection Loss, HIGH ────────
    error1_in = ErrorLogCreate(
        device_id=device_iu_001.id if device_iu_001 else None,
        error_type="Connection Loss",
        severity="HIGH",
        description="Intermittent connection drops during heavy rain",
        reported_by=person_map.get("ahmed", personnel[0] if personnel else None).id
        if person_map.get("ahmed") or personnel
        else None,
    )
    error1 = await repo.create(db, error1_in)
    reporter_id = error1_in.reported_by

    await repo.create_step(
        db,
        error1.id,
        TroubleshootEntryCreate(
            step_description="Inspected cable connections",
            action_taken="Visually inspected all cable connections at the IU site",
            performed_by=reporter_id,
        ),
        1,
    )
    await repo.create_step(
        db,
        error1.id,
        TroubleshootEntryCreate(
            step_description="Replaced weatherproof sealant",
            action_taken="Applied new weatherproof sealant on exposed connectors",
            resolution="Connection stabilized after sealant replacement",
            performed_by=reporter_id,
        ),
        2,
    )
    error1.resolved = True
    error1.resolved_at = datetime.now(timezone.utc)
    error1.resolved_by = reporter_id
    await db.flush()
    await db.refresh(error1)

    await record_audit(
        db,
        action="SEED_CREATE",
        entity_type="error_log",
        entity_id=error1.id,
        user_id=user_id,
        new_values={"error_type": "Connection Loss", "severity": "HIGH"},
    )
    results.append(await _build_error_response(db, error1))

    # ─── Error 2: Couple A2, Signal Degradation, MEDIUM ─────────
    error2_in = ErrorLogCreate(
        couple_id=couple_a2.id if couple_a2 else None,
        error_type="Signal Degradation",
        severity="MEDIUM",
        description="Signal strength dropped below 60%",
        reported_by=person_map.get("maria", personnel[1] if len(personnel) > 1 else None).id
        if person_map.get("maria") or (len(personnel) > 1)
        else None,
    )
    error2 = await repo.create(db, error2_in)

    await repo.create_step(
        db,
        error2.id,
        TroubleshootEntryCreate(
            step_description="Checked alignment of OU",
            action_taken="Verified outdoor unit alignment using laser tool",
            performed_by=error2_in.reported_by,
        ),
        1,
    )

    await record_audit(
        db,
        action="SEED_CREATE",
        entity_type="error_log",
        entity_id=error2.id,
        user_id=user_id,
        new_values={"error_type": "Signal Degradation", "severity": "MEDIUM"},
    )
    results.append(await _build_error_response(db, error2))

    # ─── Error 3: Device OU-00002, Hardware Fault, CRITICAL ─────
    error3_in = ErrorLogCreate(
        device_id=device_ou_002.id if device_ou_002 else None,
        error_type="Hardware Fault",
        severity="CRITICAL",
        description="OU unit not responding to ping",
        reported_by=person_map.get("fatima", personnel[2] if len(personnel) > 2 else None).id
        if person_map.get("fatima") or (len(personnel) > 2)
        else None,
    )
    error3 = await repo.create(db, error3_in)

    await record_audit(
        db,
        action="SEED_CREATE",
        entity_type="error_log",
        entity_id=error3.id,
        user_id=user_id,
        new_values={"error_type": "Hardware Fault", "severity": "CRITICAL"},
    )
    results.append(await _build_error_response(db, error3))

    # ─── Error 4: Couple B1, Configuration Mismatch, LOW ────────
    error4_reporter_id = (
        person_map.get("lars", personnel[3] if len(personnel) > 3 else None).id
        if person_map.get("lars") or (len(personnel) > 3)
        else None
    )
    error4_in = ErrorLogCreate(
        couple_id=couple_b1.id if couple_b1 else None,
        error_type="Configuration Mismatch",
        severity="LOW",
        description="Firmware versions differ between IU and OU",
        reported_by=error4_reporter_id,
    )
    error4 = await repo.create(db, error4_in)

    await repo.create_step(
        db,
        error4.id,
        TroubleshootEntryCreate(
            step_description="Documented current firmware versions",
            action_taken="Recorded IU v2.1.0 and OU v2.0.3",
            performed_by=error4_reporter_id,
        ),
        1,
    )
    await repo.create_step(
        db,
        error4.id,
        TroubleshootEntryCreate(
            step_description="Scheduled firmware update",
            action_taken="Created maintenance window for firmware update",
            performed_by=error4_reporter_id,
        ),
        2,
    )
    await repo.create_step(
        db,
        error4.id,
        TroubleshootEntryCreate(
            step_description="Updated firmware, verified match",
            action_taken="Updated OU to v2.1.0, confirmed both units on same version",
            resolution="Firmware versions now match at v2.1.0",
            performed_by=error4_reporter_id,
        ),
        3,
    )
    error4.resolved = True
    error4.resolved_at = datetime.now(timezone.utc)
    error4.resolved_by = error4_reporter_id
    await db.flush()
    await db.refresh(error4)

    await record_audit(
        db,
        action="SEED_CREATE",
        entity_type="error_log",
        entity_id=error4.id,
        user_id=user_id,
        new_values={"error_type": "Configuration Mismatch", "severity": "LOW"},
    )
    results.append(await _build_error_response(db, error4))

    # ─── Error 5: Pair 02, RF Interference, MEDIUM ──────────────
    error5_reporter_id = (
        person_map.get("james", personnel[4] if len(personnel) > 4 else None).id
        if person_map.get("james") or (len(personnel) > 4)
        else None
    )
    error5_in = ErrorLogCreate(
        pair_id=pair_02.id if pair_02 else None,
        error_type="RF Interference",
        severity="MEDIUM",
        description="RF listener detecting noise on channel 5",
        reported_by=error5_reporter_id,
    )
    error5 = await repo.create(db, error5_in)

    await repo.create_step(
        db,
        error5.id,
        TroubleshootEntryCreate(
            step_description="Ran spectrum analysis",
            action_taken="Used spectrum analyzer to identify noise source on channel 5",
            performed_by=error5_reporter_id,
        ),
        1,
    )

    await record_audit(
        db,
        action="SEED_CREATE",
        entity_type="error_log",
        entity_id=error5.id,
        user_id=user_id,
        new_values={"error_type": "RF Interference", "severity": "MEDIUM"},
    )
    results.append(await _build_error_response(db, error5))

    logger.info("Seeded 5 error logs with troubleshoot steps")
    return results