import math
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional
from datetime import datetime

from modules.audit_trail.repository import (
    get_audit_entries,
    get_entity_audit,
    get_user_audit,
    get_audit_stats,
)
from modules.audit_trail.schemas import AuditEntryResponse, AuditStatsResponse


def generate_description(
    action: str,
    entity_type: str,
    old_values: Optional[dict],
    new_values: Optional[dict],
) -> str:
    name_fields = ["name", "serial_number", "full_name", "template_name", "error_type"]

    if action in ("CREATE", "SEED_CREATE"):
        name = None
        if new_values:
            for f in name_fields:
                if f in new_values:
                    name = new_values[f]
                    break
        if name:
            return f"Created {entity_type} '{name}'"
        return f"Created {entity_type}"

    if action == "UPDATE":
        if old_values and new_values:
            changed = [k for k in new_values if k in old_values and old_values[k] != new_values[k]]
            if not changed:
                changed = list(new_values.keys())
            if changed:
                fields_str = ", ".join(changed[:5])
                if len(changed) > 5:
                    fields_str += f" (+{len(changed) - 5} more)"
                return f"Updated {entity_type}: {fields_str}"
        return f"Updated {entity_type}"

    if action == "DELETE":
        name = None
        if old_values:
            for f in name_fields:
                if f in old_values:
                    name = old_values[f]
                    break
        if name:
            return f"Deleted {entity_type} '{name}'"
        return f"Deleted {entity_type}"

    if action == "STATUS_CHANGE":
        old_status = old_values.get("status") if old_values else None
        new_status = new_values.get("status") if new_values else None
        if old_status and new_status:
            return f"Changed {entity_type} status from {old_status} to {new_status}"
        return f"Changed {entity_type} status"

    if action == "RESOLVE":
        return f"Resolved {entity_type} error"

    if action == "ADD_STEP":
        return f"Added troubleshooting step to {entity_type}"

    return f"{action} on {entity_type}"


def _row_to_response(row, description: str) -> AuditEntryResponse:
    return AuditEntryResponse(
        id=row.id,
        action=row.action,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        changed_by=row.changed_by,
        old_values=row.old_values,
        new_values=row.new_values,
        timestamp=row.timestamp,
        user_name=row.user_name,
        description=description,
    )


async def list_audit_entries(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> dict:
    filters: dict = {}
    if entity_type:
        filters["entity_type"] = entity_type
    if action:
        filters["action"] = action
    if user_id:
        filters["changed_by"] = user_id
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to

    skip = (page - 1) * size
    rows, total = await get_audit_entries(db, skip=skip, limit=size, filters=filters or None)

    items = []
    for row in rows:
        desc = generate_description(row.action, row.entity_type, row.old_values, row.new_values)
        items.append(_row_to_response(row, desc))

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 0,
    }


async def list_entity_audit(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    page: int = 1,
    size: int = 20,
) -> dict:
    skip = (page - 1) * size
    rows, total = await get_entity_audit(db, entity_type, entity_id, skip=skip, limit=size)

    items = []
    for row in rows:
        desc = generate_description(row.action, row.entity_type, row.old_values, row.new_values)
        items.append(_row_to_response(row, desc))

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 0,
    }


async def list_user_audit(
    db: AsyncSession,
    user_id: UUID,
    page: int = 1,
    size: int = 20,
) -> dict:
    skip = (page - 1) * size
    rows, total = await get_user_audit(db, user_id, skip=skip, limit=size)

    items = []
    for row in rows:
        desc = generate_description(row.action, row.entity_type, row.old_values, row.new_values)
        items.append(_row_to_response(row, desc))

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if size > 0 else 0,
    }


async def fetch_audit_stats(db: AsyncSession) -> AuditStatsResponse:
    stats = await get_audit_stats(db)
    return AuditStatsResponse(**stats)