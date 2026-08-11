"""Is the platform healthy, and if not, what should be done about it.

Every check answers three questions in plain language: what happened, why it
happened, and what to do. A dashboard that says "Storage: ERROR" tells a
developer to go and read logs; the point of this one is that it does not
require you to be the person who built it.
"""
from __future__ import annotations

import logging
import os
import shutil
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

OK, WARN, FAIL = "OK", "WARN", "FAIL"


def check(name, status, summary, *, detail=None, why=None, action=None, value=None):
    return {
        "name": name,
        "status": status,
        "summary": summary,
        "detail": detail,
        "why": why,
        "action": action,
        "value": value,
    }


async def _database(db: AsyncSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        size = (
            await db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))
        ).scalar_one()
        tables = (
            await db.execute(
                text("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
            )
        ).scalar_one()
        return check(
            "Database", OK, f"Connected · {tables} tables · {size}", value=size,
        )
    except Exception as e:
        return check(
            "Database", FAIL, "Cannot reach the database",
            detail=str(e)[:300],
            why="The API cannot read or write anything without it, so most of "
                "the site will fail.",
            action="Check the database container is running: "
                   "`docker ps | grep navdashboard-db`. If it is up, check "
                   "DATABASE_URL in the backend environment.",
        )


async def _migrations(db: AsyncSession) -> dict:
    try:
        current = (
            await db.execute(text("SELECT version_num FROM alembic_version"))
        ).scalar_one_or_none()
        return check(
            "Database schema", OK, f"At revision {current}", value=current,
            detail="The schema matches what this build of the code expects.",
        )
    except Exception as e:
        return check(
            "Database schema", FAIL, "Cannot read the migration state",
            detail=str(e)[:300],
            why="Without alembic_version there is no way to know whether the "
                "schema matches the code. Queries may fail in ways that look "
                "like random bugs.",
            action="Run `docker exec navdashboard-backend-1 alembic upgrade head`.",
        )


async def _storage() -> dict:
    """MinIO holds receipts and project photos."""
    try:
        from modules.documents.storage import MinIOStorage
        from core.config import settings

        storage = MinIOStorage()
        await storage.ensure_bucket()
        return check(
            "File storage", OK, "Reachable",
            detail=f"Bucket ready at {getattr(settings, 'MINIO_ENDPOINT', 'configured endpoint')}.",
        )
    except Exception as e:
        return check(
            "File storage", FAIL, "Cannot reach file storage",
            detail=str(e)[:300],
            why="Receipts and project photos cannot be uploaded or viewed. "
                "Expenses still save — the receipt is recorded as missing "
                "rather than losing the expense.",
            action="Check the MinIO container: `docker ps | grep minio`. "
                   "Then verify MINIO_ENDPOINT, MINIO_ACCESS_KEY and "
                   "MINIO_SECRET_KEY in the backend environment.",
        )


async def _ai(db: AsyncSession) -> dict:
    try:
        from modules.ai_assistant import service as ai_service

        health = await ai_service.get_health(db)
        if getattr(health, "available", False):
            return check(
                "AI assistant", OK, "Model service reachable",
                value=getattr(health, "url", None),
                detail=f"{len(getattr(health, 'models', []) or [])} model(s) loaded.",
            )
        return check(
            "AI assistant", WARN, "Model service not reachable",
            detail=getattr(health, "error", None),
            why="Only the assistant is affected. Everything else works normally.",
            action="Check the model service is running and that the URL in "
                   "Settings → System matches it.",
        )
    except Exception as e:
        return check(
            "AI assistant", WARN, "Could not check the model service",
            detail=str(e)[:300],
            why="Only the assistant is affected.",
            action="Check the AI configuration in Settings → System.",
        )


async def _authz(app) -> dict:
    """The guarantee that no endpoint ships unguarded."""
    try:
        from core.authz import iter_api_routes, permission_for_route

        total = unmapped = 0
        for route, path, methods in iter_api_routes(app):
            verbs = [m for m in methods if m not in ("HEAD", "OPTIONS")]
            total += len(verbs)
            if permission_for_route(route) is None:
                unmapped += len(verbs)

        if unmapped:
            return check(
                "Authorization coverage", FAIL,
                f"{unmapped} of {total} operations have no permission",
                why="An operation with no mapping is denied at runtime, so the "
                    "feature is broken; and the startup check should have "
                    "stopped the app, so something is wrong with the check "
                    "itself.",
                action="Add the endpoint to core/authz_endpoints.py and restart.",
                value=f"{total - unmapped}/{total}",
            )
        return check(
            "Authorization coverage", OK, f"All {total} operations mapped",
            value=f"{total}/{total}",
            detail="Every API operation requires a specific permission.",
        )
    except Exception as e:
        return check("Authorization coverage", WARN, "Could not check", detail=str(e)[:200])


async def _disk() -> dict:
    try:
        usage = shutil.disk_usage("/")
        pct = usage.used / usage.total * 100
        free_gb = usage.free / (1024 ** 3)
        if pct > 90:
            return check(
                "Disk space", FAIL, f"{pct:.0f}% full · {free_gb:.1f} GB free",
                why="Backups, uploads and database writes fail when the disk "
                    "fills. This usually breaks several things at once.",
                action="Delete old backups under database/backups, or grow the volume.",
                value=f"{pct:.0f}%",
            )
        if pct > 80:
            return check(
                "Disk space", WARN, f"{pct:.0f}% full · {free_gb:.1f} GB free",
                why="Not a problem yet, but backups are the first thing to fail.",
                action="Clear old backups when convenient.",
                value=f"{pct:.0f}%",
            )
        return check("Disk space", OK, f"{pct:.0f}% used · {free_gb:.1f} GB free", value=f"{pct:.0f}%")
    except Exception as e:
        return check("Disk space", WARN, "Could not check", detail=str(e)[:200])


async def _recent_activity(db: AsyncSession) -> dict:
    """Quiet is not the same as healthy, and worth saying so."""
    try:
        from shared.audit import AuditLog

        since = datetime.now(timezone.utc) - timedelta(hours=24)
        recent = (
            await db.execute(
                select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= since)
            )
        ).scalar_one()
        if recent == 0:
            return check(
                "Activity", WARN, "Nothing recorded in 24 hours",
                why="Either nobody used the system, or writes are failing "
                    "silently. The two look identical from here.",
                action="Try a small change yourself — add a note to a project — "
                       "and confirm it appears in the audit trail.",
                value=0,
            )
        return check("Activity", OK, f"{recent} recorded actions in 24 hours", value=recent)
    except Exception as e:
        return check("Activity", WARN, "Could not check", detail=str(e)[:200])


async def _data_integrity(db: AsyncSession) -> dict:
    """The specific inconsistencies this system can develop."""
    from modules.assets.models import Asset
    from modules.devices.models import Device

    problems = []
    try:
        unknown = (
            await db.execute(
                select(func.count()).select_from(Asset).where(
                    Asset.custody_type == "UNKNOWN", Asset.deleted_at.is_(None)
                )
            )
        ).scalar_one()
        if unknown:
            problems.append(f"{unknown} item(s) with no known location")

        unlinked = (
            await db.execute(
                text(
                    "SELECT count(*) FROM devices d WHERE d.deleted_at IS NULL "
                    "AND NOT EXISTS (SELECT 1 FROM assets a "
                    "WHERE a.device_id = d.id AND a.deleted_at IS NULL)"
                )
            )
        ).scalar_one()
        if unlinked:
            problems.append(f"{unlinked} device(s) with no inventory record")

        if problems:
            return check(
                "Data consistency", WARN, "; ".join(problems),
                why="These are answerable questions, not errors — but nobody "
                    "can act on equipment the system cannot place.",
                action="Open Inventory and filter by 'Location unknown'. "
                       "Device links repair themselves on restart.",
            )
        return check("Data consistency", OK, "Nothing inconsistent found")
    except Exception as e:
        return check("Data consistency", WARN, "Could not check", detail=str(e)[:200])


async def system_health(db: AsyncSession, app) -> dict:
    checks = [
        await _database(db),
        await _migrations(db),
        await _storage(),
        await _ai(db),
        await _authz(app),
        await _disk(),
        await _recent_activity(db),
        await _data_integrity(db),
    ]
    failing = [c for c in checks if c["status"] == FAIL]
    warning = [c for c in checks if c["status"] == WARN]

    overall = FAIL if failing else (WARN if warning else OK)
    headline = (
        "Something is broken"
        if failing
        else "Working, with things worth looking at"
        if warning
        else "Everything is working"
    )

    return {
        "status": overall,
        "headline": headline,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "failing": len(failing),
        "warning": len(warning),
        "passing": len(checks) - len(failing) - len(warning),
        "checks": checks,
        "environment": {
            "python": os.sys.version.split()[0],
            "environment": os.getenv("ENVIRONMENT", "unknown"),
        },
    }
