from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ForbiddenException, NotFoundException
from modules.auth.models import User
from modules.projects.models import Project
from modules.updates.models import DailyUpdate, UpdateComment
from modules.updates.schemas import (
    CommentCreate,
    LeadershipSummary,
    UpdateCreate,
    UpdateEdit,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


async def _comments_for(db: AsyncSession, update_ids: list[UUID]) -> dict:
    """All comments for a set of updates, in one query.

    Fetched in a batch rather than per-update: a timeline of 50 updates would
    otherwise be 51 queries.
    """
    if not update_ids:
        return {}
    stmt = (
        select(UpdateComment, User.full_name)
        .join(User, User.id == UpdateComment.author_id)
        .where(
            UpdateComment.update_id.in_(update_ids),
            UpdateComment.deleted_at.is_(None),
        )
        .order_by(UpdateComment.created_at.asc())
    )
    out: dict = {}
    for comment, author_name in (await db.execute(stmt)).all():
        item = {c.name: getattr(comment, c.name) for c in comment.__table__.columns}
        item["author_name"] = author_name
        out.setdefault(comment.update_id, []).append(item)
    return out


async def list_updates(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
    person_id: UUID | None = None,
    project_id: UUID | None = None,
    author_id: UUID | None = None,
    limit: int = 100,
) -> list[dict]:
    stmt = (
        select(DailyUpdate, User.full_name, Project.name)
        .join(User, User.id == DailyUpdate.author_id)
        .outerjoin(Project, Project.id == DailyUpdate.project_id)
        .where(DailyUpdate.deleted_at.is_(None))
        # Newest first: a timeline is read from the top.
        .order_by(DailyUpdate.posted_for.desc(), DailyUpdate.created_at.desc())
        .limit(limit)
    )
    if date_from:
        stmt = stmt.where(DailyUpdate.posted_for >= date_from)
    if date_to:
        stmt = stmt.where(DailyUpdate.posted_for <= date_to)
    if person_id:
        stmt = stmt.where(DailyUpdate.person_id == person_id)
    if project_id:
        stmt = stmt.where(DailyUpdate.project_id == project_id)
    if author_id:
        stmt = stmt.where(DailyUpdate.author_id == author_id)

    rows = (await db.execute(stmt)).all()
    ids = [r[0].id for r in rows]
    comments = await _comments_for(db, ids)

    out = []
    for update, author_name, project_name in rows:
        item = {c.name: getattr(update, c.name) for c in update.__table__.columns}
        item["author_name"] = author_name
        item["project_name"] = project_name
        item["comments"] = comments.get(update.id, [])
        item["comment_count"] = len(item["comments"])
        out.append(item)
    return out


async def get_update(db: AsyncSession, update_id: UUID) -> dict:
    stmt = (
        select(DailyUpdate, User.full_name, Project.name)
        .join(User, User.id == DailyUpdate.author_id)
        .outerjoin(Project, Project.id == DailyUpdate.project_id)
        .where(DailyUpdate.id == update_id, DailyUpdate.deleted_at.is_(None))
    )
    row = (await db.execute(stmt)).one_or_none()
    if not row:
        raise NotFoundException("Update not found")
    update, author_name, project_name = row
    comments = await _comments_for(db, [update.id])
    item = {c.name: getattr(update, c.name) for c in update.__table__.columns}
    item["author_name"] = author_name
    item["project_name"] = project_name
    item["comments"] = comments.get(update.id, [])
    item["comment_count"] = len(item["comments"])
    return item


async def create_update(
    db: AsyncSession, body: UpdateCreate, user, person_id: UUID | None
) -> dict:
    update = DailyUpdate(
        author_id=user.id,
        person_id=body.person_id or person_id,
        project_id=body.project_id,
        body=body.body,
        posted_for=body.posted_for or date.today(),
    )
    db.add(update)
    await db.flush()
    await record_audit(
        db,
        action="CREATE",
        entity_type="daily_update",
        entity_id=update.id,
        user_id=user.id,
        new_values={"posted_for": str(update.posted_for)},
    )
    await db.commit()
    return await get_update(db, update.id)


async def edit_update(
    db: AsyncSession, update_id: UUID, body: UpdateEdit, user
) -> dict:
    update = (
        await db.execute(
            select(DailyUpdate).where(
                DailyUpdate.id == update_id, DailyUpdate.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not update:
        raise NotFoundException("Update not found")
    # Editing someone else's words is not a permission level, it is a different
    # act entirely. Only the author may change what an update says.
    if str(update.author_id) != str(user.id):
        raise ForbiddenException("Only the author can edit an update")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(update, field, value)
    await db.commit()
    return await get_update(db, update_id)


async def delete_update(db: AsyncSession, update_id: UUID, user) -> None:
    update = (
        await db.execute(
            select(DailyUpdate).where(
                DailyUpdate.id == update_id, DailyUpdate.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not update:
        raise NotFoundException("Update not found")
    # An admin may remove an update; only the author may have written it.
    if str(update.author_id) != str(user.id) and user.role != "ADMIN":
        raise ForbiddenException("Only the author or an admin can delete an update")

    update.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db,
        action="DELETE",
        entity_type="daily_update",
        entity_id=update.id,
        user_id=user.id,
    )
    await db.commit()


async def add_comment(
    db: AsyncSession, update_id: UUID, body: CommentCreate, user
) -> dict:
    exists = (
        await db.execute(
            select(DailyUpdate.id).where(
                DailyUpdate.id == update_id, DailyUpdate.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not exists:
        raise NotFoundException("Update not found")

    comment = UpdateComment(update_id=update_id, author_id=user.id, body=body.body)
    db.add(comment)
    await db.commit()
    return await get_update(db, update_id)


async def delete_comment(db: AsyncSession, comment_id: UUID, user) -> None:
    comment = (
        await db.execute(
            select(UpdateComment).where(
                UpdateComment.id == comment_id, UpdateComment.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not comment:
        raise NotFoundException("Comment not found")
    if str(comment.author_id) != str(user.id) and user.role != "ADMIN":
        raise ForbiddenException("Only the author or an admin can delete a comment")

    comment.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def leadership_summary(db: AsyncSession) -> LeadershipSummary:
    """Cross-module aggregate for the leadership home.

    Imports are local to keep this module out of the circular-import web that
    already exists between projects, assets, finance and troubleshooting.
    """
    from modules.assets.models import Asset
    from modules.attendance.models import AttendanceDay
    from modules.devices.models import Device
    from modules.finance.models import Expense, ExpenseClaim
    from modules.personnel.models import Person
    from modules.troubleshooting.models import ErrorLog

    today = date.today()
    month_start = today.replace(day=1)

    async def scalar(stmt, default=0):
        return (await db.execute(stmt)).scalar_one_or_none() or default

    people_total = await scalar(
        select(func.count()).select_from(Person).where(Person.deleted_at.is_(None))
    )

    # Today's attendance, grouped once rather than four separate counts.
    day_rows = (
        await db.execute(
            select(AttendanceDay.day_type, func.count())
            .where(AttendanceDay.day == today, AttendanceDay.deleted_at.is_(None))
            .group_by(AttendanceDay.day_type)
        )
    ).all()
    by_type = {t: c for t, c in day_rows}
    on_field = by_type.get("ON_FIELD", 0)
    in_office = by_type.get("IN_OFFICE", 0)
    away = sum(
        by_type.get(t, 0)
        for t in ("AT_HOME", "HOLIDAY", "LEAVE", "COMP_OFF_TAKEN")
    )
    logged_today = sum(by_type.values())

    project_rows = (
        await db.execute(
            select(Project.status, func.count())
            .where(Project.deleted_at.is_(None))
            .group_by(Project.status)
        )
    ).all()
    projects_by_status = {s: c for s, c in project_rows}

    device_rows = (
        await db.execute(
            select(Device.status, func.count())
            .where(Device.deleted_at.is_(None))
            .group_by(Device.status)
        )
    ).all()
    devices = {s: c for s, c in device_rows}

    open_errors = await scalar(
        select(func.count())
        .select_from(ErrorLog)
        .where(ErrorLog.resolved.is_(False), ErrorLog.deleted_at.is_(None))
    )

    spend = await scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= month_start, Expense.deleted_at.is_(None)
        )
    )

    pending_claims = await scalar(
        select(func.count())
        .select_from(ExpenseClaim)
        .where(ExpenseClaim.status != "SETTLED", ExpenseClaim.deleted_at.is_(None))
    )
    pending_value = await scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .select_from(Expense)
        .join(ExpenseClaim, ExpenseClaim.id == Expense.claim_id)
        .where(ExpenseClaim.status != "SETTLED", Expense.deleted_at.is_(None))
    )

    assets_deployed = await scalar(
        select(func.count())
        .select_from(Asset)
        .where(Asset.status != "IN_OFFICE", Asset.deleted_at.is_(None))
    )

    recent = await list_updates(db, limit=8)

    return LeadershipSummary(
        generated_at=datetime.now(timezone.utc),
        people_total=people_total,
        on_field_today=on_field,
        in_office_today=in_office,
        away_today=away,
        not_logged_today=max(people_total - logged_today, 0),
        active_projects=projects_by_status.get("ACTIVE", 0),
        projects_by_status=projects_by_status,
        devices_total=sum(devices.values()),
        devices_working=devices.get("WORKING", 0),
        devices_faulty=devices.get("FAULTY", 0),
        open_errors=open_errors,
        spend_this_month=float(Decimal(spend)),
        pending_claims=pending_claims,
        pending_claim_value=float(Decimal(pending_value)),
        assets_deployed=assets_deployed,
        recent_updates=recent,
    )
