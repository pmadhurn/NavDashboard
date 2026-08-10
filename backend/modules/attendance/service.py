from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.attendance.models import (
    COMP_OFF_ENTRY_TYPES,
    DAY_TYPES,
    AttendanceDay,
    CompOffLedger,
)
from modules.attendance.schemas import (
    AttendanceDayCreate,
    AttendanceDayUpdate,
    AttendanceSummary,
    CompOffBalance,
)
from modules.personnel.models import Person
from modules.projects.models import Project
from shared.audit import record_audit

logger = logging.getLogger(__name__)

# A weekend field day earns comp-off. This is the rule as stated in the brief
# and nothing more: half-days, public holidays landing on a weekend, and expiry
# are undefined policy and are deliberately NOT guessed here. Because the ledger
# is append-only, settling that policy later is new rows, not a migration.
WEEKEND_DAYS = {5, 6}  # Python weekday(): Saturday=5, Sunday=6
COMP_OFF_PER_WEEKEND_FIELD_DAY = Decimal("1.00")


async def _person_or_404(db: AsyncSession, person_id: UUID) -> Person:
    stmt = select(Person).where(Person.id == person_id, Person.deleted_at.is_(None))
    person = (await db.execute(stmt)).scalar_one_or_none()
    if not person:
        raise NotFoundException("Person not found")
    return person


def _validate(body_day_type: str, project_id, day: date) -> None:
    if body_day_type not in DAY_TYPES:
        raise BadRequestException(f"day_type must be one of {sorted(DAY_TYPES)}")
    # A field day that names no project cannot be reconciled against the project
    # it was worked on, which is the whole reason attendance is being tracked.
    if body_day_type == "ON_FIELD" and project_id is None:
        raise BadRequestException("project_id is required when day_type is ON_FIELD")
    if day > date.today() + timedelta(days=365):
        raise BadRequestException("day is implausibly far in the future")


async def _sync_comp_off_for_day(
    db: AsyncSession, entry: AttendanceDay, user_id: UUID
) -> None:
    """Keep the accrual ledger in step with one attendance row.

    Implemented in the service rather than a DB trigger so the rule is testable
    and lives where the rest of the business logic is. Idempotent: editing a day
    from ON_FIELD to LEAVE removes the accrual it had earned.
    """
    existing = (
        await db.execute(
            select(CompOffLedger).where(
                CompOffLedger.source_day_id == entry.id,
                CompOffLedger.entry_type == "ACCRUED",
            )
        )
    ).scalar_one_or_none()

    earns = entry.day_type == "ON_FIELD" and entry.day.weekday() in WEEKEND_DAYS

    if earns and existing is None:
        db.add(
            CompOffLedger(
                person_id=entry.person_id,
                entry_type="ACCRUED",
                days=COMP_OFF_PER_WEEKEND_FIELD_DAY,
                source_day_id=entry.id,
                reason=f"Field work on {entry.day.isoformat()} ({entry.day.strftime('%A')})",
                created_by=user_id,
            )
        )
    elif not earns and existing is not None:
        await db.delete(existing)

    # Spending a comp-off day is the mirror image of earning one.
    consumed = (
        await db.execute(
            select(CompOffLedger).where(
                CompOffLedger.source_day_id == entry.id,
                CompOffLedger.entry_type == "CONSUMED",
            )
        )
    ).scalar_one_or_none()

    spends = entry.day_type == "COMP_OFF_TAKEN"
    if spends and consumed is None:
        db.add(
            CompOffLedger(
                person_id=entry.person_id,
                entry_type="CONSUMED",
                days=-COMP_OFF_PER_WEEKEND_FIELD_DAY,
                source_day_id=entry.id,
                reason=f"Comp-off taken on {entry.day.isoformat()}",
                created_by=user_id,
            )
        )
    elif not spends and consumed is not None:
        await db.delete(consumed)


async def log_day(
    db: AsyncSession, body: AttendanceDayCreate, user_id: UUID
) -> AttendanceDay:
    await _person_or_404(db, body.person_id)
    _validate(body.day_type, body.project_id, body.day)

    existing = (
        await db.execute(
            select(AttendanceDay).where(
                AttendanceDay.person_id == body.person_id,
                AttendanceDay.day == body.day,
                AttendanceDay.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(
            f"{body.day.isoformat()} is already logged for this person. "
            "Edit that entry instead."
        )

    entry = AttendanceDay(
        person_id=body.person_id,
        day=body.day,
        day_type=body.day_type,
        project_id=body.project_id,
        phase_id=body.phase_id,
        departed_at=body.departed_at,
        completed_at=body.completed_at,
        note=body.note,
        logged_by=user_id,
    )
    db.add(entry)
    await db.flush()
    await _sync_comp_off_for_day(db, entry, user_id)
    await record_audit(
        db,
        action="CREATE",
        entity_type="attendance_day",
        entity_id=entry.id,
        user_id=user_id,
        new_values={"day": body.day.isoformat(), "day_type": body.day_type},
    )
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_day_owner(db: AsyncSession, entry_id: UUID) -> UUID | None:
    """The person an entry belongs to, for scope checks on edit and delete.

    The target is on the stored row rather than in the request, so it cannot be
    resolved by the route dependency.
    """
    return (
        await db.execute(
            select(AttendanceDay.person_id).where(
                AttendanceDay.id == entry_id, AttendanceDay.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()


async def update_day(
    db: AsyncSession, entry_id: UUID, body: AttendanceDayUpdate, user_id: UUID
) -> AttendanceDay:
    entry = (
        await db.execute(
            select(AttendanceDay).where(
                AttendanceDay.id == entry_id, AttendanceDay.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not entry:
        raise NotFoundException("Attendance entry not found")

    data = body.model_dump(exclude_unset=True)
    day_type = data.get("day_type", entry.day_type)
    project_id = data.get("project_id", entry.project_id)
    _validate(day_type, project_id, entry.day)

    for field, value in data.items():
        setattr(entry, field, value)
    await db.flush()
    await _sync_comp_off_for_day(db, entry, user_id)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="attendance_day",
        entity_id=entry.id,
        user_id=user_id,
        new_values=data,
    )
    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_day(db: AsyncSession, entry_id: UUID, user_id: UUID) -> None:
    entry = (
        await db.execute(
            select(AttendanceDay).where(
                AttendanceDay.id == entry_id, AttendanceDay.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not entry:
        raise NotFoundException("Attendance entry not found")

    # Drop the ledger rows this day produced, or the balance keeps credit for a
    # day that no longer exists.
    for row in (
        await db.execute(
            select(CompOffLedger).where(CompOffLedger.source_day_id == entry.id)
        )
    ).scalars():
        await db.delete(row)

    from datetime import datetime, timezone

    entry.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db,
        action="DELETE",
        entity_type="attendance_day",
        entity_id=entry.id,
        user_id=user_id,
    )
    await db.commit()


async def list_days(
    db: AsyncSession,
    person_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    project_id: UUID | None = None,
) -> list[dict]:
    stmt = (
        select(AttendanceDay, Person.full_name, Project.name)
        .join(Person, Person.id == AttendanceDay.person_id)
        .outerjoin(Project, Project.id == AttendanceDay.project_id)
        .where(AttendanceDay.deleted_at.is_(None))
        .order_by(AttendanceDay.day.desc())
    )
    if person_id:
        stmt = stmt.where(AttendanceDay.person_id == person_id)
    if date_from:
        stmt = stmt.where(AttendanceDay.day >= date_from)
    if date_to:
        stmt = stmt.where(AttendanceDay.day <= date_to)
    if project_id:
        stmt = stmt.where(AttendanceDay.project_id == project_id)

    rows = (await db.execute(stmt)).all()
    out = []
    for entry, person_name, project_name in rows:
        item = {
            c.name: getattr(entry, c.name) for c in entry.__table__.columns
        }
        item["person_name"] = person_name
        item["project_name"] = project_name
        out.append(item)
    return out


async def comp_off_balance(db: AsyncSession, person_id: UUID) -> CompOffBalance:
    person = await _person_or_404(db, person_id)

    accrued = (
        await db.execute(
            select(func.coalesce(func.sum(CompOffLedger.days), 0)).where(
                CompOffLedger.person_id == person_id, CompOffLedger.days > 0
            )
        )
    ).scalar_one()
    consumed = (
        await db.execute(
            select(func.coalesce(func.sum(CompOffLedger.days), 0)).where(
                CompOffLedger.person_id == person_id, CompOffLedger.days < 0
            )
        )
    ).scalar_one()

    return CompOffBalance(
        person_id=person_id,
        person_name=person.full_name,
        balance=Decimal(accrued) + Decimal(consumed),
        accrued=Decimal(accrued),
        consumed=abs(Decimal(consumed)),
    )


async def adjust_comp_off(
    db: AsyncSession, person_id: UUID, days: Decimal, reason: str, user_id: UUID
) -> CompOffLedger:
    await _person_or_404(db, person_id)
    if days == 0:
        raise BadRequestException("An adjustment of zero days changes nothing")

    row = CompOffLedger(
        person_id=person_id,
        entry_type="ADJUSTED",
        days=days,
        reason=reason,
        created_by=user_id,
    )
    db.add(row)
    await record_audit(
        db,
        action="CREATE",
        entity_type="comp_off_ledger",
        entity_id=row.id,
        user_id=user_id,
        new_values={"days": str(days), "reason": reason},
    )
    await db.commit()
    await db.refresh(row)
    return row


async def list_comp_off(db: AsyncSession, person_id: UUID) -> list[CompOffLedger]:
    stmt = (
        select(CompOffLedger)
        .where(CompOffLedger.person_id == person_id)
        .order_by(CompOffLedger.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def summary(
    db: AsyncSession, person_id: UUID, date_from: date, date_to: date
) -> AttendanceSummary:
    person = await _person_or_404(db, person_id)

    stmt = (
        select(AttendanceDay.day_type, func.count())
        .where(
            AttendanceDay.person_id == person_id,
            AttendanceDay.day >= date_from,
            AttendanceDay.day <= date_to,
            AttendanceDay.deleted_at.is_(None),
        )
        .group_by(AttendanceDay.day_type)
    )
    counts = {day_type: count for day_type, count in (await db.execute(stmt)).all()}
    # Report every day type, including the zeroes — a summary that omits them
    # cannot be read as "none" versus "not tracked".
    full_counts = {dt: counts.get(dt, 0) for dt in DAY_TYPES}
    balance = await comp_off_balance(db, person_id)

    return AttendanceSummary(
        person_id=person_id,
        person_name=person.full_name,
        date_from=date_from,
        date_to=date_to,
        counts=full_counts,
        total_logged=sum(full_counts.values()),
        comp_off_balance=balance.balance,
    )


async def team_board(
    db: AsyncSession, date_from: date, date_to: date
) -> list[dict]:
    """Every logged day in the range, with person and project names attached."""
    return await list_days(db, date_from=date_from, date_to=date_to)


__all__ = [
    "COMP_OFF_ENTRY_TYPES",
    "adjust_comp_off",
    "comp_off_balance",
    "delete_day",
    "get_day_owner",
    "list_comp_off",
    "list_days",
    "log_day",
    "summary",
    "team_board",
    "update_day",
]
