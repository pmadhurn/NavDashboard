"""What a person still owes, worked out fresh every time.

Tasks are derived, never stored. An engineer who logs their attendance stops
being asked for it because the query stops returning it — nothing has to
remember to delete a row, and nothing can be left nagging about work already
done. That is the difference between a task list people trust and one they
learn to ignore.

Every task carries the link that completes it. A prompt you cannot act on from
where you are reading it is just a complaint.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Ordering. Things that block someone else come before things that only affect
# you, and both come before anything merely tidy.
URGENCY = {"BLOCKING": 0, "DUE": 1, "SOON": 2}


def _task(key, title, detail, link, urgency="DUE", action="Open", count=None):
    return {
        "key": key,
        "title": title,
        "detail": detail,
        "link": link,
        "urgency": urgency,
        "action": action,
        "count": count,
    }


async def my_tasks(db: AsyncSession, user) -> list[dict]:
    """Everything this person owes right now."""
    from core.dependencies import get_current_person_id

    person_id = await get_current_person_id(db, user)
    today = date.today()
    tasks: list[dict] = []

    tasks += await _handover_tasks(db, person_id)
    tasks += await _attendance_tasks(db, person_id, today)
    tasks += await _update_tasks(db, user, person_id, today)
    tasks += await _equipment_tasks(db, person_id)
    tasks += await _expense_tasks(db, person_id, user.id)

    tasks.sort(key=lambda t: URGENCY.get(t["urgency"], 9))
    return tasks


async def _handover_tasks(db: AsyncSession, person_id) -> list[dict]:
    """Someone is waiting on you — the only kind that blocks another person."""
    if not person_id:
        return []
    from modules.assets.movement_models import AssetHandover, AssetHandoverItem

    rows = (
        await db.execute(
            select(AssetHandover.id, func.count(AssetHandoverItem.id))
            .outerjoin(AssetHandoverItem, AssetHandoverItem.handover_id == AssetHandover.id)
            .where(
                AssetHandover.to_person_id == person_id,
                AssetHandover.status == "PENDING",
                AssetHandover.deleted_at.is_(None),
            )
            .group_by(AssetHandover.id)
        )
    ).all()
    if not rows:
        return []
    items = sum(c for _, c in rows)
    return [
        _task(
            "handover.accept",
            f"Accept {len(rows)} handover{'s' if len(rows) > 1 else ''}",
            f"{items} item{'s' if items != 1 else ''} waiting for you to take responsibility",
            "/inventory/handovers",
            urgency="BLOCKING",
            action="Review",
            count=len(rows),
        )
    ]


async def _attendance_tasks(db: AsyncSession, person_id, today: date) -> list[dict]:
    if not person_id:
        return []
    from modules.attendance.models import AttendanceDay

    logged = (
        await db.execute(
            select(func.count())
            .select_from(AttendanceDay)
            .where(
                AttendanceDay.person_id == person_id,
                AttendanceDay.day == today,
                AttendanceDay.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if logged:
        return []
    return [
        _task(
            "attendance.today",
            "Log today",
            "Where were you today — field, office, home?",
            "/me/attendance",
            urgency="DUE",
            action="Log it",
        )
    ]


async def _update_tasks(db: AsyncSession, user, person_id, today: date) -> list[dict]:
    """Only asked of people actually on a project. Nagging someone with no
    project for a project update is how a task list loses its credibility."""
    if not person_id:
        return []
    from modules.projects.models import ProjectMember
    from modules.updates.models import DailyUpdate

    on_project = (
        await db.execute(
            select(func.count())
            .select_from(ProjectMember)
            .where(
                ProjectMember.person_id == person_id,
                ProjectMember.left_at.is_(None),
                ProjectMember.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if not on_project:
        return []

    posted = (
        await db.execute(
            select(func.count())
            .select_from(DailyUpdate)
            .where(
                DailyUpdate.author_id == user.id,
                DailyUpdate.posted_for == today,
                DailyUpdate.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if posted:
        return []
    return [
        _task(
            "update.today",
            "Post today's update",
            f"You are on {on_project} active project{'s' if on_project > 1 else ''}",
            "/updates",
            urgency="DUE",
            action="Write it",
        )
    ]


async def _equipment_tasks(db: AsyncSession, person_id) -> list[dict]:
    if not person_id:
        return []
    from modules.assets.models import Asset

    held = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.custody_type == "PERSON",
                Asset.custody_id == person_id,
                Asset.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if not held:
        return []

    overdue = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(
                Asset.custody_type == "PERSON",
                Asset.custody_id == person_id,
                Asset.expected_return_date.isnot(None),
                Asset.expected_return_date < func.now(),
                Asset.deleted_at.is_(None),
            )
        )
    ).scalar_one()

    out = []
    if overdue:
        out.append(
            _task(
                "equipment.overdue",
                f"{overdue} item{'s' if overdue > 1 else ''} overdue",
                "Past the date it was expected back",
                "/inventory/returns",
                urgency="BLOCKING",
                action="Account for it",
                count=overdue,
            )
        )
    else:
        out.append(
            _task(
                "equipment.held",
                f"You are holding {held} item{'s' if held > 1 else ''}",
                "Record a return when you bring anything back",
                "/inventory/returns",
                urgency="SOON",
                action="Review",
                count=held,
            )
        )
    return out


async def _expense_tasks(db: AsyncSession, person_id, user_id) -> list[dict]:
    """An advance drawn but not spent-against is money nobody has accounted
    for — worth a nudge, not an alarm."""
    if not person_id:
        return []
    from modules.finance.models import Expense, FundAllocation

    advanced = (
        await db.execute(
            select(func.coalesce(func.sum(FundAllocation.amount), 0)).where(
                FundAllocation.person_id == person_id,
                FundAllocation.deleted_at.is_(None),
            )
        )
    ).scalar_one()
    if not advanced:
        return []

    # Expenses are keyed by the LOGIN that recorded them (`added_by`), while
    # advances are keyed by the PERSON. The two identities are linked but not
    # the same column, and mixing them up would show a spurious shortfall for
    # anyone whose expenses were entered on their behalf.
    spent = (
        await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.added_by == user_id, Expense.deleted_at.is_(None)
            )
        )
    ).scalar_one()

    remaining = float(advanced) - float(spent)
    if remaining <= 0:
        return []
    return [
        _task(
            "finance.unaccounted",
            f"₹{remaining:,.0f} of advance unaccounted",
            "Add the expenses you have paid so far",
            "/finance/my",
            urgency="SOON",
            action="Add expense",
        )
    ]


# --- notifications ----------------------------------------------------------


async def notify(
    db: AsyncSession, *, user_id, kind, title, body=None, link=None,
    entity_type=None, entity_id=None, created_by=None, commit: bool = True,
):
    from modules.tasks.models import Notification

    n = Notification(
        user_id=user_id, kind=kind, title=title, body=body, link=link,
        entity_type=entity_type, entity_id=entity_id, created_by=created_by,
    )
    db.add(n)
    if commit:
        await db.commit()
        await db.refresh(n)
    return n


async def notify_person(
    db: AsyncSession, *, person_id, kind, title, body=None, link=None,
    entity_type=None, entity_id=None, created_by=None, commit: bool = False,
):
    """Notify a person by their personnel record, if they have a login.

    A notification belongs to a *user*; the equipment workflows all speak in
    *people*, and most personnel records are not linked to a login yet. An
    unlinked person is not an error here — it means there is nobody to tell,
    so we say nothing and let the caller's work go through. Refusing the
    handover because the receiver has no account would be the worse failure.

    Defaults to `commit=False`: every caller is mid-transaction, and a
    notification must never commit someone else's half-written work.
    """
    if not person_id:
        return None
    from modules.personnel.models import Person

    user_id = (
        await db.execute(select(Person.user_id).where(Person.id == person_id))
    ).scalar_one_or_none()
    if not user_id:
        logger.info("No login linked to person %s — notification skipped", person_id)
        return None
    return await notify(
        db, user_id=user_id, kind=kind, title=title, body=body, link=link,
        entity_type=entity_type, entity_id=entity_id, created_by=created_by,
        commit=commit,
    )


async def list_notifications(db: AsyncSession, user, *, unread_only=False, limit=100):
    from modules.tasks.models import Notification

    stmt = (
        select(Notification)
        .where(Notification.user_id == user.id, Notification.deleted_at.is_(None))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    return list((await db.execute(stmt)).scalars().all())


async def mark_read(db: AsyncSession, user, notification_id: UUID | None):
    """One, or all of them. Marking all read is the only way a busy list stops
    being noise."""
    from modules.tasks.models import Notification

    stmt = select(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    )
    if notification_id:
        stmt = stmt.where(Notification.id == notification_id)
    rows = (await db.execute(stmt)).scalars().all()
    now = datetime.now(timezone.utc)
    for n in rows:
        n.read_at = now
    await db.commit()
    return len(rows)
