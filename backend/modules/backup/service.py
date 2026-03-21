import logging
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from modules.backup import repository
from modules.backup.exporter import export_csv, export_xlsx
from modules.backup.importer import import_csv, import_xlsx
from modules.backup.pg_dump_handler import (
    create_pg_dump,
    delete_backup,
    list_backups,
    restore_pg_dump,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


async def create_backup_service(db: AsyncSession, user_id: UUID) -> dict:
    filename = await create_pg_dump()
    await record_audit(
        db=db,
        action="BACKUP_CREATE",
        entity_type="backup",
        entity_id=uuid4(),
        user_id=user_id,
        new_values={"filename": filename, "type": "pg_dump"},
    )
    backups = await list_backups()
    for b in backups:
        if b["filename"] == filename:
            return b
    return {"filename": filename, "size": 0, "created_at": "", "backup_type": "pg_dump"}


async def restore_backup_service(db: AsyncSession, filename: str, user_id: UUID) -> dict:
    # Record audit BEFORE restore — restore terminates DB connections,
    # which would kill our SQLAlchemy session and make audit recording fail
    await record_audit(
        db=db,
        action="BACKUP_RESTORE",
        entity_type="backup",
        entity_id=uuid4(),
        user_id=user_id,
        new_values={"filename": filename},
    )
    # Commit the audit log now since the session may be killed during restore
    await db.commit()

    result_message = await restore_pg_dump(filename)
    return {"detail": result_message}


async def get_backup_history() -> list[dict]:
    return await list_backups()


async def delete_backup_service(db: AsyncSession, filename: str, user_id: UUID) -> dict:
    await delete_backup(filename)
    await record_audit(
        db=db,
        action="BACKUP_DELETE",
        entity_type="backup",
        entity_id=uuid4(),
        user_id=user_id,
        old_values={"filename": filename},
    )
    return {"detail": f"Backup {filename} deleted"}


async def export_data(db: AsyncSession, fmt: str, tables: list[str] | None, user_id: UUID) -> bytes:
    if fmt == "csv":
        data = await export_csv(db, tables)
    else:
        data = await export_xlsx(db, tables)
    await record_audit(
        db=db,
        action="DATA_EXPORT",
        entity_type="backup",
        entity_id=uuid4(),
        user_id=user_id,
        new_values={"format": fmt, "tables": tables},
    )
    return data


async def import_data(db: AsyncSession, file_bytes: bytes, fmt: str, user_id: UUID) -> dict:
    if fmt == "csv":
        summary = await import_csv(db, file_bytes, user_id)
    else:
        summary = await import_xlsx(db, file_bytes, user_id)
    await record_audit(
        db=db,
        action="DATA_IMPORT",
        entity_type="backup",
        entity_id=uuid4(),
        user_id=user_id,
        new_values={"format": fmt, "summary": summary},
    )
    return summary


async def get_table_counts_service(db: AsyncSession) -> dict[str, int]:
    return await repository.get_table_counts(db)