from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from shared.audit import record_audit
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams, paginate

from . import repository
from .models import Person
from .schemas import AssignmentHistoryResponse, PersonCreate, PersonResponse, PersonUpdate


def _to_response(person: Person) -> PersonResponse:
    return PersonResponse.model_validate(person, from_attributes=True)


async def list_personnel(
    db: AsyncSession, params: PaginationParams, filters: dict | None = None
) -> PaginatedResponse[PersonResponse]:
    query = select(Person).where(Person.deleted_at.is_(None))
    if filters:
        query = apply_filters(query, Person, filters)
    query = query.order_by(Person.created_at.desc())
    return await paginate(db, query, params, PersonResponse)


async def get_person(db: AsyncSession, person_id: UUID) -> PersonResponse:
    person = await repository.get_by_id(db, person_id)
    if not person:
        raise NotFoundException(detail=f"Person {person_id} not found")
    return _to_response(person)


async def create_person(
    db: AsyncSession, person_in: PersonCreate, user_id: UUID
) -> PersonResponse:
    person = await repository.create(db, person_in)
    await record_audit(
        db,
        action="CREATE",
        entity_type="person",
        entity_id=person.id,
        user_id=user_id,
        new_values=person_in.model_dump(),
    )
    return _to_response(person)


async def update_person(
    db: AsyncSession, person_id: UUID, person_in: PersonUpdate, user_id: UUID
) -> PersonResponse:
    existing = await repository.get_by_id(db, person_id)
    if not existing:
        raise NotFoundException(detail=f"Person {person_id} not found")
    old_values = PersonResponse.model_validate(existing, from_attributes=True).model_dump(
        mode="json"
    )
    person = await repository.update(db, person_id, person_in)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="person",
        entity_id=person.id,
        user_id=user_id,
        old_values=old_values,
        new_values=person_in.model_dump(exclude_unset=True, mode="json"),
    )
    return _to_response(person)


async def delete_person(
    db: AsyncSession, person_id: UUID, user_id: UUID
) -> PersonResponse:
    existing = await repository.get_by_id(db, person_id)
    if not existing:
        raise NotFoundException(detail=f"Person {person_id} not found")
    old_values = PersonResponse.model_validate(existing, from_attributes=True).model_dump(
        mode="json"
    )
    person = await repository.soft_delete(db, person_id)
    await record_audit(
        db,
        action="DELETE",
        entity_type="person",
        entity_id=person.id,
        user_id=user_id,
        old_values=old_values,
    )
    return _to_response(person)


async def get_person_assignments(
    db: AsyncSession, person_id: UUID
) -> list[AssignmentHistoryResponse]:
    person = await repository.get_by_id(db, person_id)
    if not person:
        raise NotFoundException(detail=f"Person {person_id} not found")
    assignments = await repository.get_assignments(db, person_id)
    return [
        AssignmentHistoryResponse.model_validate(a, from_attributes=True)
        for a in assignments
    ]


async def seed_personnel(db: AsyncSession, user_id: UUID) -> list[PersonResponse]:
    count = await repository.count_all(db)
    if count > 0:
        return []

    seed_data = [
        PersonCreate(
            full_name="Ahmed Al-Rashid",
            role="Technician",
            email="ahmed@example.com",
        ),
        PersonCreate(
            full_name="Maria Santos",
            role="Installer",
            email="maria@example.com",
        ),
        PersonCreate(
            full_name="James Chen",
            role="Manager",
            email="james@example.com",
        ),
        PersonCreate(
            full_name="Fatima Noor",
            role="Technician",
            email="fatima@example.com",
        ),
        PersonCreate(
            full_name="Lars Eriksson",
            role="Field Engineer",
            email="lars@example.com",
        ),
    ]

    results = []
    for data in seed_data:
        person = await repository.create(db, data)
        await record_audit(
            db,
            action="CREATE",
            entity_type="person",
            entity_id=person.id,
            user_id=user_id,
            new_values=data.model_dump(),
        )
        results.append(_to_response(person))

    return results