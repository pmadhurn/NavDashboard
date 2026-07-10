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
from .schemas import (
    AssignmentHistoryResponse,
    BackfillResult,
    PersonCreate,
    PersonResponse,
    PersonUpdate,
)


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


# ── Identity resolvers (one person ↔ one login) ──────────────────────────────

async def person_for_user(db: AsyncSession, user_id: UUID) -> Person | None:
    stmt = select(Person).where(Person.user_id == user_id, Person.deleted_at.is_(None))
    return (await db.execute(stmt)).scalar_one_or_none()


async def user_for_person(db: AsyncSession, person_id: UUID):
    person = await repository.get_by_id(db, person_id)
    return person.user_id if person else None


async def link_user(
    db: AsyncSession, person_id: UUID, target_user_id: UUID | None, changed_by: UUID
) -> PersonResponse:
    """Link (or unlink when target_user_id is None) a Person to a login User."""
    from core.exceptions import ConflictException

    person = await repository.get_by_id(db, person_id)
    if not person:
        raise NotFoundException(detail=f"Person {person_id} not found")

    if target_user_id is not None:
        existing = await person_for_user(db, target_user_id)
        if existing and existing.id != person_id:
            raise ConflictException("That login is already linked to another person")

    person.user_id = target_user_id
    await db.commit()
    await db.refresh(person)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="personnel",
        entity_id=person.id,
        user_id=changed_by,
        new_values={"user_id": str(target_user_id) if target_user_id else None},
    )
    return _to_response(person)


async def backfill_user_links(db: AsyncSession, changed_by: UUID) -> BackfillResult:
    """Auto-link personnel to users by exact (case-insensitive) email match.
    Name-only matches are intentionally NOT auto-linked."""
    from sqlalchemy import func

    from modules.auth.models import User

    linked = already = unmatched = 0
    persons = (
        await db.execute(select(Person).where(Person.deleted_at.is_(None)))
    ).scalars().all()

    for person in persons:
        if person.user_id is not None:
            already += 1
            continue
        if not person.email:
            unmatched += 1
            continue
        user = (
            await db.execute(
                select(User).where(
                    func.lower(User.email) == person.email.lower(),
                    User.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if not user:
            unmatched += 1
            continue
        # skip if that user is already linked elsewhere
        if await person_for_user(db, user.id):
            unmatched += 1
            continue
        person.user_id = user.id
        linked += 1

    await db.commit()
    if linked:
        await record_audit(
            db,
            action="UPDATE",
            entity_type="personnel",
            entity_id=changed_by,
            user_id=changed_by,
            new_values={"backfilled_links": linked},
        )
    return BackfillResult(linked=linked, already_linked=already, unmatched_personnel=unmatched)


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