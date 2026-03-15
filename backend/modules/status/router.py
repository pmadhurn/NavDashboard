from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from shared.pagination import PaginatedResponse, PaginationParams

from .schemas import StatusChangeLogResponse, StatusChangeRequest, StatusStatsResponse
from . import service

router = APIRouter()


@router.post("/change", response_model=StatusChangeLogResponse)
async def change_status(
    request: StatusChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.change_status(db, request, current_user.id)


@router.get(
    "/history/{entity_type}/{entity_id}",
    response_model=PaginatedResponse[StatusChangeLogResponse],
)
async def get_status_history(
    entity_type: str,
    entity_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    return await service.get_status_history(db, entity_type, entity_id, params)


@router.get("/stats", response_model=StatusStatsResponse)
async def get_status_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_status_stats(db)