from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.couples.models import Couple
from modules.devices.models import Device
from modules.pairs.models import Pair
from modules.troubleshooting.models import ErrorLog
from shared.audit import AuditLog


async def get_entity_counts(db: AsyncSession) -> dict[str, int]:
    """Count total devices, couples, pairs (non-deleted)."""
    device_q = select(func.count()).select_from(Device).where(Device.deleted_at.is_(None))
    couple_q = select(func.count()).select_from(Couple).where(Couple.deleted_at.is_(None))
    pair_q = select(func.count()).select_from(Pair).where(Pair.deleted_at.is_(None))

    device_result = await db.execute(device_q)
    couple_result = await db.execute(couple_q)
    pair_result = await db.execute(pair_q)

    return {
        "total_devices": device_result.scalar() or 0,
        "total_couples": couple_result.scalar() or 0,
        "total_pairs": pair_result.scalar() or 0,
    }


async def get_active_error_count(db: AsyncSession) -> int:
    """Count error_logs where resolved=False and deleted_at IS NULL."""
    q = (
        select(func.count())
        .select_from(ErrorLog)
        .where(ErrorLog.deleted_at.is_(None))
        .where(ErrorLog.resolved == False)  # noqa: E712
    )
    result = await db.execute(q)
    return result.scalar() or 0


async def get_device_status_counts(db: AsyncSession) -> dict[str, int]:
    """Count devices grouped by status (non-deleted)."""
    q = (
        select(
            func.count().filter(Device.status == "WORKING").label("working"),
            func.count().filter(Device.status == "NOT_WORKING").label("not_working"),
            func.count().filter(Device.status == "FAULTY").label("faulty"),
        )
        .select_from(Device)
        .where(Device.deleted_at.is_(None))
    )
    result = await db.execute(q)
    row = result.one()
    return {
        "devices_working": row.working or 0,
        "devices_not_working": row.not_working or 0,
        "devices_faulty": row.faulty or 0,
    }


async def get_status_distribution(db: AsyncSession) -> list[dict[str, Any]]:
    """For each entity type (device, couple, pair), count by status."""
    distributions: list[dict[str, Any]] = []

    for entity_type, model in [("device", Device), ("couple", Couple), ("pair", Pair)]:
        q = (
            select(
                func.count().filter(model.status == "WORKING").label("working"),
                func.count().filter(model.status == "NOT_WORKING").label("not_working"),
                func.count().filter(model.status == "FAULTY").label("faulty"),
            )
            .select_from(model)
            .where(model.deleted_at.is_(None))
        )
        result = await db.execute(q)
        row = result.one()
        distributions.append({
            "entity_type": entity_type,
            "working": row.working or 0,
            "not_working": row.not_working or 0,
            "faulty": row.faulty or 0,
        })

    return distributions


async def get_device_type_breakdown(db: AsyncSession) -> list[dict[str, Any]]:
    """Count devices grouped by device_type."""
    q = (
        select(Device.device_type, func.count().label("count"))
        .where(Device.deleted_at.is_(None))
        .group_by(Device.device_type)
        .order_by(Device.device_type)
    )
    result = await db.execute(q)
    rows = result.all()
    return [{"device_type": row.device_type, "count": row.count} for row in rows]


async def get_error_trends(db: AsyncSession, days: int = 30) -> list[dict[str, Any]]:
    """Count errors per day for the last N days, broken down by severity.
    Fill in zero-count days (no gaps in the timeline)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    q = (
        select(
            func.date_trunc("day", ErrorLog.reported_at).label("date"),
            ErrorLog.severity,
            func.count().label("count"),
        )
        .where(ErrorLog.deleted_at.is_(None))
        .where(ErrorLog.reported_at >= cutoff)
        .group_by(text("1"), ErrorLog.severity)
        .order_by(text("1"))
    )
    result = await db.execute(q)
    rows = result.all()

    # Build lookup: {date_str: {severity: count}}
    date_severity_map: dict[str, dict[str, int]] = {}
    for row in rows:
        date_str = row.date.strftime("%Y-%m-%d")
        if date_str not in date_severity_map:
            date_severity_map[date_str] = {}
        severity_key = (row.severity or "LOW").upper()
        date_severity_map[date_str][severity_key] = row.count

    # Fill in all days in the range
    trend_points: list[dict[str, Any]] = []
    current_date = cutoff.date()
    end_date = datetime.now(timezone.utc).date()

    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        severities = date_severity_map.get(date_str, {})
        low = severities.get("LOW", 0)
        medium = severities.get("MEDIUM", 0)
        high = severities.get("HIGH", 0)
        critical = severities.get("CRITICAL", 0)
        total = low + medium + high + critical

        trend_points.append({
            "date": date_str,
            "count": total,
            "severity_low": low,
            "severity_medium": medium,
            "severity_high": high,
            "severity_critical": critical,
        })
        current_date += timedelta(days=1)

    return trend_points


async def get_recent_activity(db: AsyncSession, limit: int = 20) -> list[dict[str, Any]]:
    """Get the most recent audit_logs entries, ordered by timestamp desc."""
    q = (
        select(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    rows = result.scalars().all()

    activities: list[dict[str, Any]] = []
    for row in rows:
        action = row.action or "UNKNOWN"
        entity_type = row.entity_type or "entity"
        entity_id = row.entity_id

        # Build human-readable description
        action_upper = action.upper()
        if action_upper == "CREATE":
            description = f"Created {entity_type} {entity_id}"
        elif action_upper == "UPDATE":
            description = f"Updated {entity_type} {entity_id}"
        elif action_upper == "DELETE":
            description = f"Deleted {entity_type} {entity_id}"
        elif action_upper == "STATUS_CHANGE":
            description = f"Status changed on {entity_type} {entity_id}"
        else:
            description = f"{action} on {entity_type} {entity_id}"

        activities.append({
            "id": row.id,
            "action": action_upper,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "description": description,
            "user_id": row.changed_by,
            "timestamp": row.timestamp,
        })

    return activities


async def get_pair_status_breakdown(db: AsyncSession) -> list[dict[str, Any]]:
    """Count pairs grouped by status."""
    q = (
        select(Pair.status, func.count().label("count"))
        .where(Pair.deleted_at.is_(None))
        .group_by(Pair.status)
        .order_by(Pair.status)
    )
    result = await db.execute(q)
    rows = result.all()
    return [{"status": row.status, "count": row.count} for row in rows]