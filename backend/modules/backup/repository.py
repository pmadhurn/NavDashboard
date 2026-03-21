from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_table_counts(db: AsyncSession) -> dict[str, int]:
    """Get row counts for all exportable tables."""
    tables = [
        "devices",
        "couples",
        "pairs",
        "locations",
        "location_history",
        "personnel",
        "fitting_materials",
        "material_templates",
        "error_logs",
        "troubleshoot_entries",
        "status_change_logs",
        "users",
    ]
    counts = {}
    for table in tables:
        try:
            result = await db.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE deleted_at IS NULL")
            )
            counts[table] = result.scalar() or 0
        except Exception:
            try:
                result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                counts[table] = result.scalar() or 0
            except Exception:
                counts[table] = 0
    return counts