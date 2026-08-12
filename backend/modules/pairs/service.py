from __future__ import annotations

from math import ceil
from uuid import UUID

from sqlalchemy import select
from sqlalchemy import func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.couples.models import Couple
from modules.couples.schemas import CoupleResponse
from modules.personnel.models import Person
from shared.audit import record_audit
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams
from shared.propagation import derive_status_from_children as _derive_pair_status

from . import repository
from .models import Pair
from .schemas import PairCreate, PairResponse, PairStatsResponse, PairUpdate

STATUS_COLORS: dict[str, str] = {
    "WORKING": "#5F8F6B",
    "NOT_WORKING": "#B68A3C",
    "FAULTY": "#9B3E3E",
}


def _get_status_color(status: str) -> str:
    return STATUS_COLORS.get(status, "#888888")


def _make_json_safe(data: dict) -> dict:
    safe: dict = {}
    for k, v in data.items():
        if isinstance(v, UUID):
            safe[k] = str(v)
        elif isinstance(v, dict):
            safe[k] = _make_json_safe(v)
        elif isinstance(v, list):
            safe[k] = [str(i) if isinstance(i, UUID) else i for i in v]
        else:
            safe[k] = v
    return safe


async def _get_person_name(db: AsyncSession, person_id: UUID | None) -> str | None:
    if not person_id:
        return None
    stmt = select(Person).where(Person.id == person_id, Person.deleted_at.is_(None))
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    return person.full_name if person else None


async def _get_pair_couples(db: AsyncSession, pair_id: UUID) -> list[Couple]:
    stmt = select(Couple).where(
        Couple.pair_id == pair_id, Couple.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _build_pair_response(db: AsyncSession, pair: Pair) -> PairResponse:
    from modules.couples.service import _build_couple_response

    couples = await _get_pair_couples(db, pair.id)
    couple_responses: list[CoupleResponse] = []
    for c in couples:
        couple_responses.append(await _build_couple_response(db, c))

    person_name = await _get_person_name(db, pair.handling_person_id)

    return PairResponse(
        id=pair.id,
        name=pair.name,
        status=pair.status,
        status_color=_get_status_color(pair.status),
        status_override=pair.status_override,
        handling_person_id=pair.handling_person_id,
        handling_person_name=person_name,
        couples=couple_responses,
        notes=pair.notes,
        custom_fields=pair.custom_fields,
        created_at=pair.created_at,
        updated_at=pair.updated_at,
    )


async def _auto_derive_and_set_status(db: AsyncSession, pair: Pair) -> None:
    if pair.status_override:
        return
    couples = await _get_pair_couples(db, pair.id)
    statuses = [c.status for c in couples]
    derived = _derive_pair_status(statuses) if statuses else "WORKING"
    if pair.status != derived:
        pair.status = derived
        await db.flush()


async def list_pairs(
    db: AsyncSession,
    params: PaginationParams,
    filters: dict | None = None,
) -> PaginatedResponse[PairResponse]:
    query = select(Pair).where(Pair.deleted_at.is_(None))
    if filters:
        query = apply_filters(query, Pair, filters)
    query = query.order_by(Pair.created_at.desc())

    count_q = select(sa_func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    offset = (params.page - 1) * params.size
    rows_q = query.offset(offset).limit(params.size)
    rows_result = await db.execute(rows_q)
    pairs = list(rows_result.scalars().all())

    items: list[PairResponse] = []
    for p in pairs:
        items.append(await _build_pair_response(db, p))

    pages = ceil(total / params.size) if params.size > 0 else 0
    return PaginatedResponse(
        items=items, total=total, page=params.page, size=params.size, pages=pages
    )


async def get_pair(db: AsyncSession, pair_id: UUID) -> PairResponse:
    pair = await repository.get_by_id(db, pair_id)
    if not pair:
        raise NotFoundException("Pair not found")
    return await _build_pair_response(db, pair)


async def create_pair(
    db: AsyncSession, pair_in: PairCreate, user_id: UUID
) -> PairResponse:
    # Business Rule #11: exactly 2 couples
    if len(pair_in.couple_ids) != 2:
        raise BadRequestException("A pair must have exactly 2 couples")

    if pair_in.couple_ids[0] == pair_in.couple_ids[1]:
        raise BadRequestException("A pair must consist of 2 different couples")

    couple_objs: list[Couple] = []
    for cid in pair_in.couple_ids:
        stmt = select(Couple).where(Couple.id == cid, Couple.deleted_at.is_(None))
        result = await db.execute(stmt)
        couple = result.scalar_one_or_none()
        if not couple:
            raise NotFoundException(f"Couple {cid} not found")
        if couple.pair_id is not None:
            raise ConflictException(
                f"Couple '{couple.name}' is already assigned to another pair"
            )
        couple_objs.append(couple)

    # Auto-derive status (Business Rule #12)
    derived_status = _derive_pair_status([c.status for c in couple_objs])

    pair = await repository.create(
        db,
        {
            "name": pair_in.name,
            "status": derived_status,
            "status_override": False,
            "handling_person_id": pair_in.handling_person_id,
            "notes": pair_in.notes,
            "custom_fields": pair_in.custom_fields,
        },
    )

    # Assign pair_id to both couples
    for couple in couple_objs:
        couple.pair_id = pair.id
    await db.flush()

    await record_audit(
        db,
        action="CREATE",
        entity_type="pair",
        entity_id=pair.id,
        user_id=user_id,
        new_values=_make_json_safe({"name": pair.name, "status": pair.status}),
    )

    await db.refresh(pair)
    return await _build_pair_response(db, pair)


async def update_pair(
    db: AsyncSession, pair_id: UUID, pair_in: PairUpdate, user_id: UUID
) -> PairResponse:
    pair = await repository.get_by_id(db, pair_id)
    if not pair:
        raise NotFoundException("Pair not found")

    old_values = _make_json_safe({"name": pair.name, "status": pair.status})
    update_data = pair_in.model_dump(exclude_unset=True)

    # Handle status override logic (Business Rule #12)
    setting_override = update_data.get("status_override")
    manual_status = update_data.get("status")

    updated = await repository.update(db, pair_id, update_data)
    if not updated:
        raise NotFoundException("Pair not found")

    # If override is being turned off, or was already off and no explicit override set, auto-derive
    if setting_override is False or (setting_override is None and not updated.status_override):
        await _auto_derive_and_set_status(db, updated)
    elif updated.status_override and manual_status:
        # Manual override with explicit status — already set by update
        pass

    await record_audit(
        db,
        action="UPDATE",
        entity_type="pair",
        entity_id=pair_id,
        user_id=user_id,
        old_values=old_values,
        new_values=_make_json_safe(update_data),
    )

    await db.refresh(updated)
    return await _build_pair_response(db, updated)


async def delete_pair(
    db: AsyncSession, pair_id: UUID, user_id: UUID
) -> PairResponse:
    pair = await repository.get_by_id(db, pair_id)
    if not pair:
        raise NotFoundException("Pair not found")

    response = await _build_pair_response(db, pair)

    # Business Rule #4: set pair_id = NULL on couples, do NOT delete them
    couples = await _get_pair_couples(db, pair.id)
    for couple in couples:
        couple.pair_id = None
    await db.flush()

    # Soft-delete the pair
    await repository.soft_delete(db, pair_id)

    await record_audit(
        db,
        action="DELETE",
        entity_type="pair",
        entity_id=pair_id,
        user_id=user_id,
        old_values=_make_json_safe({"name": pair.name}),
    )

    return response


async def get_pair_stats(db: AsyncSession) -> PairStatsResponse:
    stats = await repository.get_stats(db)
    return PairStatsResponse(total=stats["total"], by_status=stats["by_status"])
