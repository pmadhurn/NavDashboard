from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import (
    get_current_user,
    get_current_person_id,
    require_permission,
)
from modules.updates import service
from modules.updates.schemas import (
    CommentCreate,
    LeadershipSummary,
    UpdateCreate,
    UpdateEdit,
    UpdateResponse,
)

router = APIRouter()


@router.get("", response_model=list[UpdateResponse])
async def list_updates(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    person_id: Optional[UUID] = Query(None),
    project_id: Optional[UUID] = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """The shared timeline.

    Deliberately not scope-filtered: the point of daily updates is that the
    team can see what the team is doing. Who may *write* is gated by
    `updates.create`; who may read is gated by `updates.read`.
    """
    return await service.list_updates(
        db,
        date_from=date_from,
        date_to=date_to,
        person_id=person_id,
        project_id=project_id,
        limit=limit,
    )


@router.get("/mine", response_model=list[UpdateResponse])
async def my_updates(
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.list_updates(db, author_id=user.id, limit=limit)


@router.get("/{update_id}", response_model=UpdateResponse)
async def get_update(
    update_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.get_update(db, update_id)


@router.post("", response_model=UpdateResponse, status_code=201)
async def create_update(
    body: UpdateCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    person_id = await get_current_person_id(db, user)
    return await service.create_update(db, body, user, person_id)


@router.put("/{update_id}", response_model=UpdateResponse)
async def edit_update(
    update_id: UUID,
    body: UpdateEdit,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.edit_update(db, update_id, body, user)


@router.delete("/{update_id}", status_code=204)
async def delete_update(
    update_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await service.delete_update(db, update_id, user)


@router.post("/{update_id}/comments", response_model=UpdateResponse, status_code=201)
async def add_comment(
    update_id: UUID,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Gated by `updates.comment`, which is deliberately separate from
    `updates.delete`: leadership's whole purpose here is to reply, and they
    should not need the power to delete other people's updates in order to say
    "well done"."""
    return await service.add_comment(db, update_id, body, user)


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await service.delete_comment(db, comment_id, user)


# --- leadership -------------------------------------------------------------

leadership_router = APIRouter()


@leadership_router.get("/summary", response_model=LeadershipSummary)
async def leadership_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.leadership_summary(db)
