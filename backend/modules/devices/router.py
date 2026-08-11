from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.devices import service
from modules.devices.schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceStatsResponse,
    DeviceStatusHistoryResponse,
    DeviceUpdate,
    StatusChangeRequest,
)
from shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[DeviceResponse])
async def list_devices(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    device_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    serial_number__contains: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters: dict = {}
    if device_type:
        filters["device_type"] = device_type
    if status:
        filters["status"] = status
    if serial_number__contains:
        filters["serial_number__contains"] = serial_number__contains
    return await service.list_devices(db, params, filters if filters else None)


@router.get("/stats", response_model=DeviceStatsResponse)
async def device_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_device_stats(db)


@router.get("/serial/{serial_number}", response_model=DeviceResponse)
async def find_by_serial(
    serial_number: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from core.exceptions import NotFoundException
    from modules.devices.repository import find_by_serial as repo_find

    device = await repo_find(db, serial_number)
    if not device:
        raise NotFoundException(f"Device with serial '{serial_number}' not found")
    from modules.devices.service import _to_response

    return _to_response(device)


@router.post("/", response_model=DeviceResponse, status_code=201)
async def create_device(
    device_in: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.create_device(db, device_in, current_user.id)


@router.get("/{id}", response_model=DeviceResponse)
async def get_device(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_device(db, id)


@router.put("/{id}", response_model=DeviceResponse)
async def update_device(
    id: UUID,
    device_in: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.update_device(db, id, device_in, current_user.id)


@router.delete("/{id}", response_model=DeviceResponse)
async def delete_device(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.delete_device(db, id, current_user.id)


@router.put("/{id}/status", response_model=DeviceResponse)
async def change_status(
    id: UUID,
    body: StatusChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.change_device_status(
        db, id, body.status, body.reason, current_user.id
    )


@router.get("/{id}/status-history", response_model=list[DeviceStatusHistoryResponse])
async def get_status_history(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_device_status_history(db, id)
