from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.tasks import service

router = APIRouter()


class TaskResponse(BaseModel):
    key: str
    title: str
    detail: Optional[str] = None
    link: Optional[str] = None
    urgency: str
    action: str
    count: Optional[int] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    read_at: Optional[str] = None
    created_at: str

    @classmethod
    def from_row(cls, n):
        return cls(
            id=n.id, kind=n.kind, title=n.title, body=n.body, link=n.link,
            entity_type=n.entity_type, entity_id=n.entity_id,
            read_at=n.read_at.isoformat() if n.read_at else None,
            created_at=n.created_at.isoformat(),
        )


@router.get("/me", response_model=list[TaskResponse])
async def my_tasks(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """What the signed-in person still owes.

    Derived from live state, so completing the work removes the task without
    anything having to remember to.
    """
    return await service.my_tasks(db, user)


@router.get("/notifications", response_model=list[NotificationResponse])
async def my_notifications(
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = await service.list_notifications(db, user, unread_only=unread_only)
    return [NotificationResponse.from_row(n) for n in rows]


@router.post("/notifications/read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"marked": await service.mark_read(db, user, None)}


@router.post("/notifications/{notification_id}/read")
async def mark_one_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return {"marked": await service.mark_read(db, user, notification_id)}
