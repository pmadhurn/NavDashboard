from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.audit_trail.schemas import AuditStatsResponse
from modules.audit_trail.service import (
    list_audit_entries,
    list_entity_audit,
    list_user_audit,
    fetch_audit_stats,
)

router = APIRouter()


@router.get("/")
async def get_audit_list(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    entity_type: str | None = Query(None),
    action: str | None = Query(None),
    user_id: UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_audit_entries(
        db,
        page=page,
        size=size,
        entity_type=entity_type,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_entity_audit(db, entity_type, entity_id, page=page, size=size)


@router.get("/user/{user_id}")
async def get_user_audit_trail(
    user_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_user_audit(db, user_id, page=page, size=size)


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_audit_stats(db)