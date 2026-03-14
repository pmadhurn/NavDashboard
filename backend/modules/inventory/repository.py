from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import FittingMaterial, MaterialTemplate
from .schemas import MaterialCreate, MaterialUpdate, TemplateCreate, TemplateUpdate


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[FittingMaterial]:
    stmt = select(FittingMaterial).where(
        FittingMaterial.id == id, FittingMaterial.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession, skip: int = 0, limit: int = 100, filters: dict | None = None
) -> list[FittingMaterial]:
    stmt = select(FittingMaterial).where(FittingMaterial.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, FittingMaterial, filters)
    stmt = stmt.order_by(FittingMaterial.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: MaterialCreate) -> FittingMaterial:
    material = FittingMaterial(**obj_in.model_dump())
    db.add(material)
    await db.flush()
    await db.refresh(material)
    return material


async def update(
    db: AsyncSession, id: UUID, obj_in: MaterialUpdate
) -> Optional[FittingMaterial]:
    material = await get_by_id(db, id)
    if not material:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    material.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(material)
    return material


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[FittingMaterial]:
    material = await get_by_id(db, id)
    if not material:
        return None
    material.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(material)
    return material


async def get_by_couple(db: AsyncSession, couple_id: UUID) -> list[FittingMaterial]:
    stmt = (
        select(FittingMaterial)
        .where(
            FittingMaterial.couple_id == couple_id,
            FittingMaterial.deleted_at.is_(None),
        )
        .order_by(FittingMaterial.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_templates(db: AsyncSession) -> list[MaterialTemplate]:
    stmt = select(MaterialTemplate).order_by(MaterialTemplate.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_template_by_id(
    db: AsyncSession, template_id: UUID
) -> Optional[MaterialTemplate]:
    stmt = select(MaterialTemplate).where(MaterialTemplate.id == template_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_template(
    db: AsyncSession, obj_in: TemplateCreate
) -> MaterialTemplate:
    template = MaterialTemplate(**obj_in.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def update_template(
    db: AsyncSession, template_id: UUID, obj_in: TemplateUpdate
) -> Optional[MaterialTemplate]:
    template = await get_template_by_id(db, template_id)
    if not template:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    template.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(template)
    return template


async def get_suggestions(
    db: AsyncSession, query: str, limit: int = 10
) -> list[dict]:
    stmt = (
        select(
            FittingMaterial.name,
            func.count(FittingMaterial.id).label("count"),
        )
        .where(
            FittingMaterial.deleted_at.is_(None),
            FittingMaterial.name.ilike(f"%{query}%"),
        )
        .group_by(FittingMaterial.name)
        .order_by(func.count(FittingMaterial.id).desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [{"name": row.name, "count": row.count} for row in result.all()]


async def count_all(db: AsyncSession) -> int:
    stmt = (
        select(func.count())
        .select_from(FittingMaterial)
        .where(FittingMaterial.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    return result.scalar_one()