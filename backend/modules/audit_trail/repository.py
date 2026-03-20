from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from uuid import UUID
from typing import Optional
from datetime import datetime

from shared.audit import AuditLog
from modules.auth.models import User


async def get_audit_entries(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    filters: Optional[dict] = None,
) -> tuple[list, int]:
    base_query = (
        select(
            AuditLog.id,
            AuditLog.action,
            AuditLog.entity_type,
            AuditLog.entity_id,
            AuditLog.changed_by,
            AuditLog.old_values,
            AuditLog.new_values,
            AuditLog.timestamp,
            User.full_name.label("user_name"),
        )
        .outerjoin(User, AuditLog.changed_by == User.id)
    )

    conditions = []
    if filters:
        if filters.get("entity_type"):
            conditions.append(AuditLog.entity_type == filters["entity_type"])
        if filters.get("entity_id"):
            conditions.append(AuditLog.entity_id == filters["entity_id"])
        if filters.get("action"):
            conditions.append(AuditLog.action == filters["action"])
        if filters.get("changed_by"):
            conditions.append(AuditLog.changed_by == filters["changed_by"])
        if filters.get("date_from"):
            conditions.append(AuditLog.timestamp >= filters["date_from"])
        if filters.get("date_to"):
            conditions.append(AuditLog.timestamp <= filters["date_to"])

    if conditions:
        base_query = base_query.where(and_(*conditions))

    count_subq = (
        select(func.count()).select_from(AuditLog)
    )
    if conditions:
        count_subq = count_subq.where(and_(*conditions))
    count_result = await db.execute(count_subq)
    total = count_result.scalar_one()

    query = base_query.order_by(desc(AuditLog.timestamp)).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return rows, total


async def get_entity_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list, int]:
    return await get_audit_entries(
        db,
        skip=skip,
        limit=limit,
        filters={"entity_type": entity_type, "entity_id": entity_id},
    )


async def get_user_audit(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list, int]:
    return await get_audit_entries(
        db,
        skip=skip,
        limit=limit,
        filters={"changed_by": user_id},
    )


async def get_audit_stats(db: AsyncSession) -> dict:
    total_result = await db.execute(select(func.count(AuditLog.id)))
    total = total_result.scalar_one()

    action_result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
    )
    by_action = {row[0]: row[1] for row in action_result.all()}

    entity_result = await db.execute(
        select(AuditLog.entity_type, func.count(AuditLog.id))
        .group_by(AuditLog.entity_type)
    )
    by_entity_type = {row[0]: row[1] for row in entity_result.all()}

    active_users_result = await db.execute(
        select(
            AuditLog.changed_by,
            User.full_name,
            func.count(AuditLog.id).label("count"),
        )
        .outerjoin(User, AuditLog.changed_by == User.id)
        .where(AuditLog.changed_by.isnot(None))
        .group_by(AuditLog.changed_by, User.full_name)
        .order_by(desc(func.count(AuditLog.id)))
        .limit(5)
    )
    most_active_users = [
        {
            "user_id": str(row[0]),
            "name": row[1] or "Unknown",
            "count": row[2],
        }
        for row in active_users_result.all()
    ]

    return {
        "total_entries": total,
        "by_action": by_action,
        "by_entity_type": by_entity_type,
        "most_active_users": most_active_users,
    }