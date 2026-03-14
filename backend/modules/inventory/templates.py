from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException

from . import repository
from .models import FittingMaterial
from .schemas import MaterialCreate


async def create_materials_from_template(
    db: AsyncSession, template_id: UUID, couple_id: UUID
) -> list[FittingMaterial]:
    template = await repository.get_template_by_id(db, template_id)
    if not template:
        raise NotFoundException(detail=f"Template {template_id} not found")

    created = []
    for mat_def in template.materials:
        material_in = MaterialCreate(
            couple_id=couple_id,
            name=mat_def["name"],
            quantity=mat_def.get("quantity", 1),
            unit=mat_def.get("unit"),
            is_template=False,
        )
        material = await repository.create(db, material_in)
        created.append(material)

    return created


async def copy_materials_from_couple(
    db: AsyncSession, source_couple_id: UUID, target_couple_id: UUID
) -> list[FittingMaterial]:
    source_materials = await repository.get_by_couple(db, source_couple_id)

    created = []
    for src in source_materials:
        material_in = MaterialCreate(
            couple_id=target_couple_id,
            name=src.name,
            description=src.description,
            quantity=src.quantity,
            unit=src.unit,
            is_template=False,
        )
        material = await repository.create(db, material_in)
        created.append(material)

    return created