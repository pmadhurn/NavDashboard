from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from modules.locations.schemas import LocationHistoryResponse, MapDataPoint
from shared.pagination import PaginatedResponse, PaginationParams

from . import service
from .schemas import (
    CoupleCreate,
    CoupleResponse,
    CoupleUpdate,
    LocationChangeRequest,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[CoupleResponse])
async def list_couples(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    status: Optional[str] = Query(None),
    has_rf: Optional[bool] = Query(None),
    pair_id: Optional[UUID] = Query(None),
    name__contains: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters: dict = {}
    if status:
        filters["status"] = status
    if has_rf is not None:
        filters["has_rf"] = has_rf
    if pair_id:
        filters["pair_id"] = pair_id
    if name__contains:
        filters["name__contains"] = name__contains
    return await service.list_couples(db, params, filters if filters else None)


@router.get("/map-data", response_model=list[MapDataPoint])
async def get_map_data(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_couple_map_data(db)


@router.post("/", response_model=CoupleResponse, status_code=201)
async def create_couple(
    couple_in: CoupleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN", "TECHNICIAN")),
):
    return await service.create_couple(db, couple_in, current_user.id)


@router.get("/{id}", response_model=CoupleResponse)
async def get_couple(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_couple(db, id)


@router.put("/{id}", response_model=CoupleResponse)
async def update_couple(
    id: UUID,
    couple_in: CoupleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN", "TECHNICIAN")),
):
    return await service.update_couple(db, id, couple_in, current_user.id)


@router.delete("/{id}", response_model=CoupleResponse)
async def delete_couple(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN", "TECHNICIAN")),
):
    return await service.delete_couple(db, id, current_user.id)


@router.put("/{id}/location", response_model=CoupleResponse)
async def change_location(
    id: UUID,
    location_in: LocationChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN", "TECHNICIAN")),
):
    return await service.change_couple_location(db, id, location_in, current_user.id)


@router.get(
    "/{id}/location-history",
    response_model=PaginatedResponse[LocationHistoryResponse],
)
async def get_location_history(
    id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_couple_location_history(db, id, params)


@router.post("/seed", response_model=list[CoupleResponse])
async def seed_couples(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    return await service.seed_couples(db, current_user.id)