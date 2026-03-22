import logging
from typing import Optional

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from modules.settings.models import SystemSetting

logger = logging.getLogger(__name__)


async def get_setting(db: AsyncSession, key: str) -> Optional[SystemSetting]:
    stmt = select(SystemSetting).where(
        SystemSetting.key == key,
        SystemSetting.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_all_settings(db: AsyncSession) -> list[SystemSetting]:
    stmt = (
        select(SystemSetting)
        .where(SystemSetting.deleted_at.is_(None))
        .order_by(SystemSetting.key)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def set_setting(
    db: AsyncSession,
    key: str,
    value: str,
    description: str | None = None,
) -> SystemSetting:
    """Upsert a setting by key."""
    existing = await get_setting(db, key)
    if existing:
        existing.value = value
        if description is not None:
            existing.description = description
        await db.flush()
        await db.refresh(existing)
        return existing

    setting = SystemSetting(key=key, value=value, description=description)
    db.add(setting)
    await db.flush()
    await db.refresh(setting)
    return setting


async def get_system_info(db: AsyncSession) -> dict:
    """Gather system-wide statistics."""
    # Database size
    db_size_result = await db.execute(
        text("SELECT pg_size_pretty(pg_database_size(current_database()))")
    )
    database_size = db_size_result.scalar_one()

    # Table count
    table_count_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        )
    )
    table_count = table_count_result.scalar_one()

    # Entity counts
    async def _count(table_name: str) -> int:
        try:
            result = await db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.scalar_one()
        except Exception:
            return 0

    total_devices = await _count("devices")
    total_couples = await _count("couples")
    total_pairs = await _count("pairs")
    total_documents = await _count("documents")
    total_users = await _count("users")
    total_audit_entries = await _count("audit_logs")
    total_embeddings = await _count("embedding_documents")

    return {
        "database_size": database_size,
        "table_count": table_count,
        "total_devices": total_devices,
        "total_couples": total_couples,
        "total_pairs": total_pairs,
        "total_documents": total_documents,
        "total_users": total_users,
        "total_audit_entries": total_audit_entries,
        "total_embeddings": total_embeddings,
    }


async def count_settings(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(SystemSetting).where(
        SystemSetting.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one()
