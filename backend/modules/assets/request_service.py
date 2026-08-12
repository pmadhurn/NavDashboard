"""Lifecycle of a required-item request. See request_models for why it is small."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from shared.audit import record_audit

from .request_models import (
    REQUEST_RECEIVED,
    REQUEST_REJECTED,
    REQUEST_REQUESTED,
    REQUEST_STATUSES,
    REQUEST_TRANSITIONS,
    ItemRequest,
)


async def list_requests(db: AsyncSession, status: str | None = None) -> list[ItemRequest]:
    q = select(ItemRequest).where(ItemRequest.deleted_at.is_(None))
    if status:
        q = q.where(ItemRequest.status == status)
    # Open items first, newest first within each status — the list is read
    # aloud to the boss, so the order is the priority order.
    q = q.order_by(ItemRequest.status, ItemRequest.created_at.desc())
    return list((await db.execute(q)).scalars().all())


async def enrich_requests(db: AsyncSession, rows: list[ItemRequest]) -> list[dict]:
    """Attach requester and vendor names in one batch each."""
    from modules.auth.models import User

    user_ids = {r.requested_by for r in rows}
    names: dict[UUID, str] = {}
    if user_ids:
        for uid, full_name, username in (
            await db.execute(
                select(User.id, User.full_name, User.username).where(User.id.in_(user_ids))
            )
        ).all():
            names[uid] = full_name or username
    return [
        {
            "id": r.id,
            "title": r.title,
            "details": r.details,
            "quantity": r.quantity,
            "needed_by": r.needed_by,
            "status": r.status,
            "requested_by": r.requested_by,
            "requested_by_name": names.get(r.requested_by),
            "vendor_id": r.vendor_id,
            "vendor_name": r.vendor.name if r.vendor else None,
            "estimated_cost": r.estimated_cost,
            "status_note": r.status_note,
            "resolved_at": r.resolved_at,
            "created_at": r.created_at,
        }
        for r in rows
    ]


async def list_requests_enriched(db: AsyncSession, status: str | None = None) -> list[dict]:
    return await enrich_requests(db, await list_requests(db, status))


async def _get(db: AsyncSession, request_id: UUID) -> ItemRequest:
    row = (
        await db.execute(
            select(ItemRequest).where(
                ItemRequest.id == request_id, ItemRequest.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not row:
        raise NotFoundException("Request not found")
    return row


async def create_request(db: AsyncSession, body, user_id: UUID) -> ItemRequest:
    row = ItemRequest(**body.model_dump(exclude_unset=True), requested_by=user_id)
    db.add(row)
    await record_audit(
        db, action="CREATE", entity_type="item_request",
        entity_id=row.id, user_id=user_id,
        new_values={"title": row.title, "quantity": row.quantity},
    )
    await db.commit()
    await db.refresh(row)
    return row


async def update_request(
    db: AsyncSession, request_id: UUID, body, user_id: UUID, *, may_manage: bool
) -> ItemRequest:
    row = await _get(db, request_id)
    # The requester may fix their own ask while it is still just an ask;
    # after that the record belongs to whoever manages the list.
    if not may_manage:
        if row.requested_by != user_id:
            raise ForbiddenException("Only the requester can edit this")
        if row.status != REQUEST_REQUESTED:
            raise BadRequestException(
                "This request is already being processed — ask the inventory manager"
            )
    old = {"title": row.title, "quantity": row.quantity}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    await record_audit(
        db, action="UPDATE", entity_type="item_request",
        entity_id=row.id, user_id=user_id, old_values=old,
        new_values=body.model_dump(exclude_unset=True, mode="json"),
    )
    await db.commit()
    await db.refresh(row)
    return row


async def change_status(
    db: AsyncSession, request_id: UUID, body, user_id: UUID
) -> ItemRequest:
    row = await _get(db, request_id)
    new_status = body.status
    if new_status not in REQUEST_STATUSES:
        raise BadRequestException(f"Unknown status {new_status!r}")
    if new_status not in REQUEST_TRANSITIONS[row.status]:
        raise BadRequestException(
            f"A {row.status} request cannot become {new_status}"
        )
    old_status = row.status
    row.status = new_status
    if body.status_note is not None:
        row.status_note = body.status_note
    if body.vendor_id is not None:
        row.vendor_id = body.vendor_id
    if body.estimated_cost is not None:
        row.estimated_cost = body.estimated_cost
    if new_status in (REQUEST_RECEIVED, REQUEST_REJECTED):
        row.resolved_by = user_id
        row.resolved_at = datetime.now(timezone.utc)
    await record_audit(
        db, action="UPDATE", entity_type="item_request",
        entity_id=row.id, user_id=user_id,
        old_values={"status": old_status},
        new_values={"status": new_status, "note": body.status_note},
    )
    await db.commit()
    await db.refresh(row)
    return row


async def delete_request(
    db: AsyncSession, request_id: UUID, user_id: UUID, *, may_manage: bool
) -> None:
    row = await _get(db, request_id)
    if not may_manage and (
        row.requested_by != user_id or row.status != REQUEST_REQUESTED
    ):
        raise ForbiddenException(
            "Only the requester can withdraw it, and only before it is processed"
        )
    row.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db, action="DELETE", entity_type="item_request",
        entity_id=row.id, user_id=user_id, old_values={"title": row.title},
    )
    await db.commit()
