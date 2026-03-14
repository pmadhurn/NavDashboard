from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.filters import apply_filters

from .models import AssignmentHistory, Person
from .schemas import PersonCreate, PersonUpdate


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[Person]:
    stmt = select(Person).where(Person.id == id, Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession, skip: int = 0, limit: int = 100, filters: dict | None = None
) -> list[Person]:
    stmt = select(Person).where(Person.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, Person, filters)
    stmt = stmt.order_by(Person.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: PersonCreate) -> Person:
    person = Person(**obj_in.model_dump())
    db.add(person)
    await db.flush()
    await db.refresh(person)
    return person


async def update(db: AsyncSession, id: UUID, obj_in: PersonUpdate) -> Optional[Person]:
    person = await get_by_id(db, id)
    if not person:
        return None
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    person.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(person)
    return person


async def soft_delete(db: AsyncSession, id: UUID) -> Optional[Person]:
    person = await get_by_id(db, id)
    if not person:
        return None
    person.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(person)
    return person


async def search_by_name(db: AsyncSession, query: str) -> list[Person]:
    stmt = (
        select(Person)
        .where(Person.deleted_at.is_(None))
        .where(Person.full_name.ilike(f"%{query}%"))
        .order_by(Person.full_name)
        .limit(20)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_assignments(db: AsyncSession, person_id: UUID) -> list[AssignmentHistory]:
    stmt = (
        select(AssignmentHistory)
        .where(AssignmentHistory.person_id == person_id)
        .order_by(AssignmentHistory.assigned_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_assignment(
    db: AsyncSession, person_id: UUID, entity_type: str, entity_id: UUID
) -> AssignmentHistory:
    assignment = AssignmentHistory(
        person_id=person_id,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(assignment)
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def end_assignment(
    db: AsyncSession, person_id: UUID, entity_type: str, entity_id: UUID
) -> Optional[AssignmentHistory]:
    stmt = select(AssignmentHistory).where(
        AssignmentHistory.person_id == person_id,
        AssignmentHistory.entity_type == entity_type,
        AssignmentHistory.entity_id == entity_id,
        AssignmentHistory.unassigned_at.is_(None),
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()
    if not assignment:
        return None
    assignment.unassigned_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(assignment)
    return assignment


async def count_all(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(Person).where(Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()