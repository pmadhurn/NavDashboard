from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, require_role
from modules.auth.models import User
from shared.pagination import PaginatedResponse, PaginationParams

from . import service
from .schemas import (
    AssignmentHistoryResponse,
    BackfillResult,
    LinkUserRequest,
    PersonCreate,
    PersonResponse,
    PersonUpdate,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[PersonResponse])
async def list_personnel(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
    full_name__contains: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters = {}
    if full_name__contains is not None:
        filters["full_name__contains"] = full_name__contains
    if role is not None:
        filters["role"] = role
    return await service.list_personnel(db, params, filters if filters else None)


@router.post("/", response_model=PersonResponse, status_code=201)
async def create_person(
    person_in: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_person(db, person_in, current_user.id)


@router.get("/search", response_model=list[PersonResponse])
async def search_personnel(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from . import repository

    persons = await repository.search_by_name(db, q)
    return [PersonResponse.model_validate(p, from_attributes=True) for p in persons]


@router.post("/backfill-links", response_model=BackfillResult)
async def backfill_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-link personnel to login users by exact email match."""
    return await service.backfill_user_links(db, current_user.id)


@router.post("/{person_id}/link-user", response_model=PersonResponse)
async def link_user(
    person_id: UUID,
    body: LinkUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Link a person to a login user (or unlink when user_id is null)."""
    return await service.link_user(db, person_id, body.user_id, current_user.id)


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_person(db, person_id)


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: UUID,
    person_in: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_person(db, person_id, person_in, current_user.id)


@router.delete("/{person_id}", response_model=PersonResponse)
async def delete_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.delete_person(db, person_id, current_user.id)


@router.get("/{person_id}/assignments", response_model=list[AssignmentHistoryResponse])
async def get_person_assignments(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_person_assignments(db, person_id)


@router.post("/seed", response_model=list[PersonResponse])
async def seed_personnel(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.seed_personnel(db, current_user.id)