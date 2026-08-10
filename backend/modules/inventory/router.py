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
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    SuggestionResponse,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[MaterialResponse])
async def list_materials(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    name__contains: Optional[str] = Query(None),
    couple_id: Optional[UUID] = Query(None),
    is_template: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = PaginationParams(page=page, size=size)
    filters = {}
    if name__contains is not None:
        filters["name__contains"] = name__contains
    if couple_id is not None:
        filters["couple_id"] = str(couple_id)
    if is_template is not None:
        filters["is_template"] = is_template
    return await service.list_materials(db, params, filters if filters else None)


@router.post("/", response_model=MaterialResponse, status_code=201)
async def create_material(
    material_in: MaterialCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_material(db, material_in, current_user.id)


@router.get("/suggestions", response_model=list[SuggestionResponse])
async def get_suggestions(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_suggestions(db, q)


@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_templates(db)


@router.post("/templates", response_model=TemplateResponse, status_code=201)
async def create_template(
    template_in: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_template(db, template_in, current_user.id)


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    template_in: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_template(db, template_id, template_in, current_user.id)


@router.post(
    "/from-template/{template_id}",
    response_model=list[MaterialResponse],
    status_code=201,
)
async def create_from_template(
    template_id: UUID,
    couple_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_from_template(
        db, template_id, couple_id, current_user.id
    )


@router.post(
    "/copy-from/{source_couple_id}",
    response_model=list[MaterialResponse],
    status_code=201,
)
async def copy_from_couple(
    source_couple_id: UUID,
    target_couple_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.copy_from_couple(
        db, source_couple_id, target_couple_id, current_user.id
    )


@router.get("/by-couple/{couple_id}", response_model=list[MaterialResponse])
async def get_materials_by_couple(
    couple_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_materials_by_couple(db, couple_id)


@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_material(db, material_id)


@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: UUID,
    material_in: MaterialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_material(
        db, material_id, material_in, current_user.id
    )


@router.delete("/{material_id}", response_model=MaterialResponse)
async def delete_material(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.delete_material(db, material_id, current_user.id)


@router.post("/seed", response_model=dict)
async def seed_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.seed_inventory(db, current_user.id)