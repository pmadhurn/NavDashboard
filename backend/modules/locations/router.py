from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user

from . import service
from .schemas import (
    LocationCreate,
    LocationHistoryResponse,
    LocationResponse,
    LocationUpdate,
)
from shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


@router.get("/", response_model=list[LocationResponse])
async def list_locations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from . import repository

    return [
        LocationResponse.model_validate(loc, from_attributes=True)
        for loc in await repository.get_multi(db, skip=skip, limit=limit)
    ]


@router.get("/history", response_model=PaginatedResponse[LocationHistoryResponse])
async def all_location_history(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    couple_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters: dict = {}
    if couple_id:
        filters["couple_id"] = couple_id
    return await service.get_all_location_history(
        db, params, filters if filters else None
    )


@router.get("/history/{couple_id}", response_model=PaginatedResponse[LocationHistoryResponse])
async def location_history_for_couple(
    couple_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_location_history_for_couple(db, couple_id, params)


@router.get("/{id}", response_model=LocationResponse)
async def get_location(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_location(db, id)


@router.post("/", response_model=LocationResponse, status_code=201)
async def create_location(
    location_in: LocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.create_location(db, location_in)


@router.put("/{id}", response_model=LocationResponse)
async def update_location(
    id: UUID,
    location_in: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.update_location(db, id, location_in)