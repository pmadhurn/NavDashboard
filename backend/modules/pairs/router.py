from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from shared.pagination import PaginatedResponse, PaginationParams

from .schemas import PairCreate, PairResponse, PairStatsResponse, PairUpdate
from . import service

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[PairResponse])
async def list_pairs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=500),
    status: str | None = Query(None),
    name__contains: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters: dict[str, object] = {}
    if status:
        filters["status"] = status
    if name__contains:
        filters["name__contains"] = name__contains
    return await service.list_pairs(db, params, filters if filters else None)


@router.get("/stats", response_model=PairStatsResponse)
async def get_pair_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_pair_stats(db)


@router.post("/", response_model=PairResponse, status_code=201)
async def create_pair(
    pair_in: PairCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.create_pair(db, pair_in, current_user.id)


@router.get("/{pair_id}", response_model=PairResponse)
async def get_pair(
    pair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_pair(db, pair_id)


@router.put("/{pair_id}", response_model=PairResponse)
async def update_pair(
    pair_id: UUID,
    pair_in: PairUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.update_pair(db, pair_id, pair_in, current_user.id)


@router.delete("/{pair_id}", response_model=PairResponse)
async def delete_pair(
    pair_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.delete_pair(db, pair_id, current_user.id)


@router.post("/seed", response_model=list[PairResponse])
async def seed_pairs(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.seed_pairs(db, current_user.id)