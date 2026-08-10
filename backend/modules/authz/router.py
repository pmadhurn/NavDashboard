from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.authz_catalog import catalog_payload
from core.database import get_db
from core.dependencies import get_current_user
from modules.authz import service
from modules.authz.schemas import (
    RoleCreate,
    RoleResponse,
    RoleUpdate,
    SessionResponse,
)

router = APIRouter()


@router.get("/catalog")
async def get_catalog(user=Depends(get_current_user)):
    """Every permission the system knows about, grouped for the admin screen.

    Readable by any signed-in user: it is a description of the software, not of
    anyone's access, and the permission editor needs it before it can render.
    """
    return catalog_payload()


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.list_roles(db)


@router.post("/roles", response_model=RoleResponse, status_code=201)
async def create_role(
    body: RoleCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.create_role(
        db, body.name, body.description, body.permissions, user.id
    )


@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.update_role(
        db, role_id, body.name, body.description, body.permissions, user.id
    )


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await service.delete_role(db, role_id, user.id)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    user_id: Optional[UUID] = Query(None),
    include_ended: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await service.list_sessions(db, user_id, include_ended)


@router.delete("/sessions/{session_id}", status_code=204)
async def revoke_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await service.revoke_session(db, session_id, user.id)


@router.post("/sessions/revoke-user/{target_user_id}")
async def revoke_user_sessions(
    target_user_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Sign someone out everywhere, immediately."""
    count = await service.revoke_all_for_user(db, target_user_id, user.id)
    return {"revoked": count}
