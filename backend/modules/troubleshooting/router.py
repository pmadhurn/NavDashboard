from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from shared.pagination import PaginatedResponse, PaginationParams

from .schemas import (
    ErrorLogCreate,
    ErrorLogResponse,
    ErrorLogUpdate,
    ErrorStatsResponse,
    ResolveRequest,
    TroubleshootEntryCreate,
    TroubleshootEntryResponse,
    TroubleshootEntryUpdate,
)
from . import service

router = APIRouter()


def _build_filters(
    severity: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    error_type__contains: Optional[str] = Query(None),
    device_id: Optional[UUID] = Query(None),
    couple_id: Optional[UUID] = Query(None),
    pair_id: Optional[UUID] = Query(None),
    reported_at__gte: Optional[str] = Query(None),
    reported_at__lte: Optional[str] = Query(None),
) -> dict:
    filters: dict = {}
    if severity is not None:
        filters["severity"] = severity
    if resolved is not None:
        filters["resolved"] = resolved
    if error_type__contains is not None:
        filters["error_type__contains"] = error_type__contains
    if device_id is not None:
        filters["device_id"] = device_id
    if couple_id is not None:
        filters["couple_id"] = couple_id
    if pair_id is not None:
        filters["pair_id"] = pair_id
    if reported_at__gte is not None:
        filters["reported_at__gte"] = reported_at__gte
    if reported_at__lte is not None:
        filters["reported_at__lte"] = reported_at__lte
    return filters


@router.get("/", response_model=PaginatedResponse[ErrorLogResponse])
async def list_errors(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    severity: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    error_type__contains: Optional[str] = Query(None),
    device_id: Optional[UUID] = Query(None),
    couple_id: Optional[UUID] = Query(None),
    pair_id: Optional[UUID] = Query(None),
    reported_at__gte: Optional[str] = Query(None),
    reported_at__lte: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters = _build_filters(
        severity=severity,
        resolved=resolved,
        error_type__contains=error_type__contains,
        device_id=device_id,
        couple_id=couple_id,
        pair_id=pair_id,
        reported_at__gte=reported_at__gte,
        reported_at__lte=reported_at__lte,
    )
    return await service.list_errors(db, params, filters if filters else None)


@router.get("/faulty-devices")
async def get_faulty_devices(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all devices with FAULTY status and their open error logs."""
    from sqlalchemy import select, and_
    from modules.devices.models import Device
    from modules.troubleshooting.models import ErrorLog

    # Get all faulty devices
    dev_stmt = select(Device).where(
        and_(Device.deleted_at.is_(None), Device.status == "FAULTY")
    )
    dev_result = await db.execute(dev_stmt)
    devices = dev_result.scalars().all()

    results = []
    for d in devices:
        # Fetch open errors for this device
        err_stmt = select(ErrorLog).where(
            and_(
                ErrorLog.deleted_at.is_(None),
                ErrorLog.device_id == d.id,
                ErrorLog.resolved == False,
            )
        )
        err_result = await db.execute(err_stmt)
        open_errors = err_result.scalars().all()

        results.append({
            "device_id": str(d.id),
            "serial_number": d.serial_number,
            "device_type": d.device_type,
            "status": d.status,
            "couple_id": str(d.couple_id) if d.couple_id else None,
            "open_error_count": len(open_errors),
            "errors": [
                {
                    "id": str(e.id),
                    "error_type": e.error_type,
                    "severity": e.severity,
                    "description": e.description,
                    "reported_at": e.reported_at.isoformat() if e.reported_at else None,
                }
                for e in open_errors
            ],
        })

    return results


@router.get("/stats", response_model=ErrorStatsResponse)
async def get_error_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_error_stats(db)


@router.post("/", response_model=ErrorLogResponse)
async def create_error(
    error_in: ErrorLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.create_error(db, error_in, current_user.id)


@router.get("/{error_id}", response_model=ErrorLogResponse)
async def get_error(
    error_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_error(db, error_id)


@router.put("/{error_id}", response_model=ErrorLogResponse)
async def update_error(
    error_id: UUID,
    error_in: ErrorLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.update_error(db, error_id, error_in, current_user.id)


@router.delete("/{error_id}", response_model=ErrorLogResponse)
async def delete_error(
    error_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.delete_error(db, error_id, current_user.id)


@router.post("/{error_id}/steps", response_model=TroubleshootEntryResponse)
async def add_step(
    error_id: UUID,
    step_in: TroubleshootEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.add_step(db, error_id, step_in, current_user.id)


@router.put("/{error_id}/steps/{step_id}", response_model=TroubleshootEntryResponse)
async def update_step(
    error_id: UUID,
    step_id: UUID,
    step_in: TroubleshootEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.update_step(db, error_id, step_id, step_in, current_user.id)


@router.put("/{error_id}/resolve", response_model=ErrorLogResponse)
async def resolve_error(
    error_id: UUID,
    resolve_in: ResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.resolve_error(db, error_id, resolve_in, current_user.id)


@router.get("/by-device/{device_id}", response_model=PaginatedResponse[ErrorLogResponse])
async def get_errors_by_device(
    device_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_errors_by_entity(db, "device", device_id, params)


@router.get("/by-couple/{couple_id}", response_model=PaginatedResponse[ErrorLogResponse])
async def get_errors_by_couple(
    couple_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_errors_by_entity(db, "couple", couple_id, params)


@router.get("/by-pair/{pair_id}", response_model=PaginatedResponse[ErrorLogResponse])
async def get_errors_by_pair(
    pair_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_errors_by_entity(db, "pair", pair_id, params)


@router.post("/seed", response_model=list[ErrorLogResponse])
async def seed_errors(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    return await service.seed_errors(db, current_user.id)
    