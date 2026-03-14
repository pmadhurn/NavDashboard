from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from shared.audit import record_audit
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams, paginate

from . import repository
from .models import FittingMaterial
from .schemas import (
    MaterialCreate,
    MaterialResponse,
    MaterialUpdate,
    SuggestionResponse,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)
from .templates import copy_materials_from_couple, create_materials_from_template


def _to_material_response(material: FittingMaterial) -> MaterialResponse:
    return MaterialResponse.model_validate(material, from_attributes=True)


async def list_materials(
    db: AsyncSession, params: PaginationParams, filters: dict | None = None
) -> PaginatedResponse[MaterialResponse]:
    query = select(FittingMaterial).where(FittingMaterial.deleted_at.is_(None))
    if filters:
        query = apply_filters(query, FittingMaterial, filters)
    query = query.order_by(FittingMaterial.created_at.desc())
    return await paginate(db, query, params, MaterialResponse)


async def get_material(db: AsyncSession, material_id: UUID) -> MaterialResponse:
    material = await repository.get_by_id(db, material_id)
    if not material:
        raise NotFoundException(detail=f"Material {material_id} not found")
    return _to_material_response(material)


async def create_material(
    db: AsyncSession, material_in: MaterialCreate, user_id: UUID
) -> MaterialResponse:
    material = await repository.create(db, material_in)
    await record_audit(
        db,
        action="CREATE",
        entity_type="fitting_material",
        entity_id=material.id,
        user_id=user_id,
        new_values=material_in.model_dump(mode="json"),
    )
    return _to_material_response(material)


async def update_material(
    db: AsyncSession, material_id: UUID, material_in: MaterialUpdate, user_id: UUID
) -> MaterialResponse:
    existing = await repository.get_by_id(db, material_id)
    if not existing:
        raise NotFoundException(detail=f"Material {material_id} not found")
    old_values = MaterialResponse.model_validate(
        existing, from_attributes=True
    ).model_dump(mode="json")
    material = await repository.update(db, material_id, material_in)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="fitting_material",
        entity_id=material.id,
        user_id=user_id,
        old_values=old_values,
        new_values=material_in.model_dump(exclude_unset=True, mode="json"),
    )
    return _to_material_response(material)


async def delete_material(
    db: AsyncSession, material_id: UUID, user_id: UUID
) -> MaterialResponse:
    existing = await repository.get_by_id(db, material_id)
    if not existing:
        raise NotFoundException(detail=f"Material {material_id} not found")
    old_values = MaterialResponse.model_validate(
        existing, from_attributes=True
    ).model_dump(mode="json")
    material = await repository.soft_delete(db, material_id)
    await record_audit(
        db,
        action="DELETE",
        entity_type="fitting_material",
        entity_id=material.id,
        user_id=user_id,
        old_values=old_values,
    )
    return _to_material_response(material)


async def get_materials_by_couple(
    db: AsyncSession, couple_id: UUID
) -> list[MaterialResponse]:
    materials = await repository.get_by_couple(db, couple_id)
    return [_to_material_response(m) for m in materials]


async def list_templates(db: AsyncSession) -> list[TemplateResponse]:
    templates = await repository.get_templates(db)
    return [
        TemplateResponse.model_validate(t, from_attributes=True) for t in templates
    ]


async def create_template(
    db: AsyncSession, template_in: TemplateCreate, user_id: UUID
) -> TemplateResponse:
    template = await repository.create_template(db, template_in)
    await record_audit(
        db,
        action="CREATE",
        entity_type="material_template",
        entity_id=template.id,
        user_id=user_id,
        new_values=template_in.model_dump(mode="json"),
    )
    return TemplateResponse.model_validate(template, from_attributes=True)


async def update_template(
    db: AsyncSession, template_id: UUID, template_in: TemplateUpdate, user_id: UUID
) -> TemplateResponse:
    existing = await repository.get_template_by_id(db, template_id)
    if not existing:
        raise NotFoundException(detail=f"Template {template_id} not found")
    old_values = TemplateResponse.model_validate(
        existing, from_attributes=True
    ).model_dump(mode="json")
    template = await repository.update_template(db, template_id, template_in)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="material_template",
        entity_id=template.id,
        user_id=user_id,
        old_values=old_values,
        new_values=template_in.model_dump(exclude_unset=True, mode="json"),
    )
    return TemplateResponse.model_validate(template, from_attributes=True)


async def create_from_template(
    db: AsyncSession, template_id: UUID, couple_id: UUID, user_id: UUID
) -> list[MaterialResponse]:
    materials = await create_materials_from_template(db, template_id, couple_id)
    for material in materials:
        await record_audit(
            db,
            action="CREATE",
            entity_type="fitting_material",
            entity_id=material.id,
            user_id=user_id,
            new_values={
                "name": material.name,
                "quantity": material.quantity,
                "unit": material.unit,
                "couple_id": str(couple_id),
                "from_template": str(template_id),
            },
        )
    return [_to_material_response(m) for m in materials]


async def copy_from_couple(
    db: AsyncSession,
    source_couple_id: UUID,
    target_couple_id: UUID,
    user_id: UUID,
) -> list[MaterialResponse]:
    materials = await copy_materials_from_couple(db, source_couple_id, target_couple_id)
    for material in materials:
        await record_audit(
            db,
            action="CREATE",
            entity_type="fitting_material",
            entity_id=material.id,
            user_id=user_id,
            new_values={
                "name": material.name,
                "quantity": material.quantity,
                "unit": material.unit,
                "couple_id": str(target_couple_id),
                "copied_from_couple": str(source_couple_id),
            },
        )
    return [_to_material_response(m) for m in materials]


async def get_suggestions(
    db: AsyncSession, query: str
) -> list[SuggestionResponse]:
    results = await repository.get_suggestions(db, query)
    return [SuggestionResponse(**r) for r in results]


async def seed_inventory(db: AsyncSession, user_id: UUID) -> dict:
    count = await repository.count_all(db)
    templates = await repository.get_templates(db)
    if count > 0 or len(templates) > 0:
        return {"templates_created": 0}

    template_data = [
        TemplateCreate(
            template_name="Standard Rooftop Kit",
            description="Standard materials for rooftop installations",
            materials=[
                {"name": "Mounting Bracket", "quantity": 2, "unit": "pcs"},
                {"name": "Ethernet Cable Cat6", "quantity": 1, "unit": "pcs"},
                {"name": "Weatherproof Sealant", "quantity": 1, "unit": "tube"},
                {"name": "Cable Ties", "quantity": 10, "unit": "pcs"},
            ],
        ),
        TemplateCreate(
            template_name="Indoor Minimal Kit",
            description="Minimal materials for indoor installations",
            materials=[
                {"name": "Wall Mount Plate", "quantity": 1, "unit": "pcs"},
                {"name": "Power Adapter", "quantity": 1, "unit": "pcs"},
                {"name": "Short Patch Cable", "quantity": 1, "unit": "pcs"},
            ],
        ),
    ]

    for data in template_data:
        template = await repository.create_template(db, data)
        await record_audit(
            db,
            action="CREATE",
            entity_type="material_template",
            entity_id=template.id,
            user_id=user_id,
            new_values=data.model_dump(mode="json"),
        )

    return {"templates_created": 2}