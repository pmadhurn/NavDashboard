from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from core.exceptions import BadRequestException, NotFoundException
from modules.auth.models import User
from modules.audit_trail.schemas import AuditStatsResponse
from modules.audit_trail.service import (
    list_audit_entries,
    list_entity_audit,
    list_user_audit,
    fetch_audit_stats,
)
from shared.audit import AuditLog, record_audit

router = APIRouter()

# Entity type → SQLAlchemy model mapping for revert
_ENTITY_MODEL_MAP = None


def _get_entity_model_map():
    global _ENTITY_MODEL_MAP
    if _ENTITY_MODEL_MAP is None:
        from modules.devices.models import Device
        from modules.couples.models import Couple
        from modules.pairs.models import Pair
        from modules.personnel.models import Person
        from modules.troubleshooting.models import ErrorLog

        _ENTITY_MODEL_MAP = {
            "device": Device,
            "couple": Couple,
            "pair": Pair,
            "person": Person,
            "personnel": Person,
            "error_log": ErrorLog,
        }
    return _ENTITY_MODEL_MAP


@router.get("/")
async def get_audit_list(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    entity_type: str | None = Query(None),
    action: str | None = Query(None),
    user_id: UUID | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_audit_entries(
        db,
        page=page,
        size=size,
        entity_type=entity_type,
        action=action,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_entity_audit(db, entity_type, entity_id, page=page, size=size)


@router.get("/user/{user_id}")
async def get_user_audit_trail(
    user_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await list_user_audit(db, user_id, page=page, size=size)


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_statistics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await fetch_audit_stats(db)


@router.post("/{audit_id}/revert")
async def revert_audit_entry(
    audit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revert an audit entry by restoring old_values to the entity. Admin only."""
    # Look up the audit entry
    stmt = select(AuditLog).where(AuditLog.id == audit_id)
    result = await db.execute(stmt)
    audit_entry = result.scalar_one_or_none()
    if not audit_entry:
        raise NotFoundException("Audit entry not found")

    if not audit_entry.old_values:
        raise BadRequestException(
            "Cannot revert: no previous values recorded for this entry"
        )

    if audit_entry.action in ("CREATE", "SEED_CREATE"):
        raise BadRequestException(
            "Cannot revert a CREATE action — use delete instead"
        )

    # Find the model class for this entity type
    model_map = _get_entity_model_map()
    model_class = model_map.get(audit_entry.entity_type)
    if not model_class:
        raise BadRequestException(
            f"Revert not supported for entity type: {audit_entry.entity_type}"
        )

    # Look up the entity
    entity_stmt = select(model_class).where(model_class.id == audit_entry.entity_id)
    entity_result = await db.execute(entity_stmt)
    entity = entity_result.scalar_one_or_none()
    if not entity:
        raise NotFoundException(
            f"{audit_entry.entity_type} with id {audit_entry.entity_id} not found"
        )

    # Capture current values before reverting (for the audit trail)
    current_values = {}
    for key in audit_entry.old_values:
        if hasattr(entity, key):
            current_values[key] = getattr(entity, key)

    # Apply old values
    for key, value in audit_entry.old_values.items():
        if hasattr(entity, key):
            setattr(entity, key, value)

    # Update the timestamp
    if hasattr(entity, "updated_at"):
        entity.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(entity)

    # Record the revert action
    await record_audit(
        db,
        action="REVERT",
        entity_type=audit_entry.entity_type,
        entity_id=audit_entry.entity_id,
        user_id=current_user.id,
        old_values=current_values,
        new_values=audit_entry.old_values,
    )

    return {
        "message": f"Successfully reverted {audit_entry.entity_type}",
        "entity_id": str(audit_entry.entity_id),
        "reverted_fields": list(audit_entry.old_values.keys()),
    }