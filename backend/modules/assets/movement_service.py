"""Handovers, kits, repairs, and resolving what came back.

Every state change here ends in `custody_service`, so an item's timeline reads
as one story no matter which workflow produced the line.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.assets import custody_service as cs
from modules.assets.models import Asset
from modules.assets.movement_models import (
    HANDOVER_ACCEPTED,
    HANDOVER_CANCELLED,
    HANDOVER_PENDING,
    HANDOVER_REJECTED,
    OUTCOME_DAMAGED,
    OUTCOME_HANDED_TO_CUSTOMER,
    OUTCOME_LEFT_AT_SITE,
    OUTCOME_LOST,
    OUTCOME_RETURNED,
    RETURN_OUTCOMES,
    AssetBundle,
    AssetBundleItem,
    AssetHandover,
    AssetHandoverItem,
    AssetRepair,
)
from modules.personnel.models import Person
from modules.tasks.service import notify_person
from shared.audit import record_audit

logger = logging.getLogger(__name__)


def _items_phrase(count: int) -> str:
    return f"{count} item" if count == 1 else f"{count} items"


def _asset_lines(assets, note: str | None) -> str | None:
    """What is actually being moved, in the notification itself.

    A notification that only says "you have a handover" makes you open the app
    to find out whether it matters. Naming the items is the whole difference.
    """
    names = ", ".join(f"{a.name} ({a.asset_code})" for a in assets[:6])
    if len(assets) > 6:
        names += f", and {len(assets) - 6} more"
    return f"{names}\n{note}" if note else (names or None)


# --- handover ---------------------------------------------------------------


async def _person_or_404(db: AsyncSession, person_id: UUID) -> Person:
    person = (
        await db.execute(
            select(Person).where(Person.id == person_id, Person.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not person:
        raise NotFoundException("Person not found")
    return person


async def create_handover(
    db: AsyncSession, *, from_person_id, to_person_id, asset_ids, note, user_id
) -> AssetHandover:
    """Offer items to someone. Custody does not move yet."""
    if from_person_id == to_person_id:
        raise BadRequestException("Choose a different person to hand over to")
    from_person = await _person_or_404(db, from_person_id)
    await _person_or_404(db, to_person_id)
    if not asset_ids:
        raise BadRequestException("Select at least one item to hand over")

    assets = (
        await db.execute(
            select(Asset).where(Asset.id.in_(asset_ids), Asset.deleted_at.is_(None))
        )
    ).scalars().all()
    if len(assets) != len(set(asset_ids)):
        raise NotFoundException("One or more of those items no longer exists")

    # You can only hand on what you are actually holding.
    not_held = [
        a.asset_code
        for a in assets
        if not (a.custody_type == "PERSON" and str(a.custody_id) == str(from_person_id))
    ]
    if not_held:
        raise ConflictException(
            "These are not currently with that person: " + ", ".join(sorted(not_held))
        )

    # An item already offered elsewhere would otherwise be promised twice.
    pending = (
        await db.execute(
            select(Asset.asset_code)
            .join(AssetHandoverItem, AssetHandoverItem.asset_id == Asset.id)
            .join(AssetHandover, AssetHandover.id == AssetHandoverItem.handover_id)
            .where(
                AssetHandoverItem.asset_id.in_(asset_ids),
                AssetHandover.status == HANDOVER_PENDING,
                AssetHandover.deleted_at.is_(None),
            )
        )
    ).scalars().all()
    if pending:
        raise ConflictException(
            "Already awaiting acceptance in another handover: " + ", ".join(sorted(pending))
        )

    handover = AssetHandover(
        from_person_id=from_person_id,
        to_person_id=to_person_id,
        note=note,
        initiated_by=user_id,
        status=HANDOVER_PENDING,
    )
    db.add(handover)
    await db.flush()
    for a in assets:
        db.add(AssetHandoverItem(handover_id=handover.id, asset_id=a.id))

    await notify_person(
        db,
        person_id=to_person_id,
        kind="handover.offered",
        title=f"{from_person.full_name} wants to hand you {_items_phrase(len(assets))}",
        body=_asset_lines(assets, note),
        link="/inventory/handovers",
        entity_type="asset_handover",
        entity_id=handover.id,
        created_by=user_id,
    )

    await record_audit(
        db, action="CREATE", entity_type="asset_handover", entity_id=handover.id,
        user_id=user_id, new_values={"items": len(assets), "to": str(to_person_id)},
    )
    await db.commit()
    await db.refresh(handover)
    return handover


async def respond_to_handover(
    db: AsyncSession, handover_id: UUID, *, accept: bool, note, user_id
) -> AssetHandover:
    """Accept or decline. Custody moves only on acceptance."""
    handover = (
        await db.execute(
            select(AssetHandover).where(
                AssetHandover.id == handover_id, AssetHandover.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not handover:
        raise NotFoundException("Handover not found")
    if handover.status != HANDOVER_PENDING:
        raise ConflictException(
            f"This handover was already {handover.status.lower()}"
        )

    handover.status = HANDOVER_ACCEPTED if accept else HANDOVER_REJECTED
    handover.response_note = note
    handover.responded_by = user_id
    handover.responded_at = datetime.now(timezone.utc)

    items = (
        await db.execute(
            select(Asset)
            .join(AssetHandoverItem, AssetHandoverItem.asset_id == Asset.id)
            .where(AssetHandoverItem.handover_id == handover.id)
        )
    ).scalars().all()

    if accept:
        for asset in items:
            await cs.move_custody(
                db, asset,
                to_custody_type="PERSON",
                to_custody_id=handover.to_person_id,
                event_type="HANDED_OVER",
                reason=note or "Handover accepted",
                source_type="asset_handover",
                source_id=handover.id,
                user_id=user_id,
                commit=False,
            )

    # The person who offered is the one still wondering. Declining matters more
    # than accepting: the items are back on their hands and they may not know.
    responder = await _person_name(db, handover.to_person_id) or "They"
    await notify_person(
        db,
        person_id=handover.from_person_id,
        kind="handover.accepted" if accept else "handover.declined",
        title=(
            f"{responder} accepted {_items_phrase(len(items))}"
            if accept
            else f"{responder} declined {_items_phrase(len(items))} — still with you"
        ),
        body=_asset_lines(items, note),
        link="/inventory/handovers",
        entity_type="asset_handover",
        entity_id=handover.id,
        created_by=user_id,
    )

    await record_audit(
        db, action="UPDATE", entity_type="asset_handover", entity_id=handover.id,
        user_id=user_id, new_values={"status": handover.status},
    )
    await db.commit()
    await db.refresh(handover)
    return handover


async def cancel_handover(db: AsyncSession, handover_id: UUID, user_id) -> AssetHandover:
    handover = (
        await db.execute(
            select(AssetHandover).where(
                AssetHandover.id == handover_id, AssetHandover.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not handover:
        raise NotFoundException("Handover not found")
    if handover.status != HANDOVER_PENDING:
        raise ConflictException(f"This handover was already {handover.status.lower()}")
    handover.status = HANDOVER_CANCELLED
    handover.responded_by = user_id
    handover.responded_at = datetime.now(timezone.utc)
    # Whoever was asked to accept has it in their task list. Withdrawing it
    # silently would leave them chasing something nobody is waiting for.
    offerer = await _person_name(db, handover.from_person_id) or "Someone"
    await notify_person(
        db,
        person_id=handover.to_person_id,
        kind="handover.cancelled",
        title=f"{offerer} withdrew a handover — nothing for you to accept",
        link="/inventory/handovers",
        entity_type="asset_handover",
        entity_id=handover.id,
        created_by=user_id,
    )
    await db.commit()
    await db.refresh(handover)
    return handover


async def list_handovers(
    db: AsyncSession, *, person_id=None, status=None, limit: int = 200
) -> list[dict]:
    stmt = (
        select(AssetHandover)
        .where(AssetHandover.deleted_at.is_(None))
        .order_by(AssetHandover.created_at.desc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(AssetHandover.status == status)
    if person_id:
        stmt = stmt.where(
            (AssetHandover.from_person_id == person_id)
            | (AssetHandover.to_person_id == person_id)
        )
    rows = (await db.execute(stmt)).scalars().all()

    out = []
    for h in rows:
        items = (
            await db.execute(
                select(Asset.id, Asset.asset_code, Asset.name)
                .join(AssetHandoverItem, AssetHandoverItem.asset_id == Asset.id)
                .where(AssetHandoverItem.handover_id == h.id)
            )
        ).all()
        item = {c.name: getattr(h, c.name) for c in h.__table__.columns}
        item["from_name"] = await _person_name(db, h.from_person_id)
        item["to_name"] = await _person_name(db, h.to_person_id)
        item["items"] = [
            {"id": i, "asset_code": c, "name": n} for i, c, n in items
        ]
        out.append(item)
    return out


async def _person_name(db: AsyncSession, person_id):
    if not person_id:
        return None
    return (
        await db.execute(select(Person.full_name).where(Person.id == person_id))
    ).scalar_one_or_none()


# --- bundles ----------------------------------------------------------------


async def list_bundles(db: AsyncSession) -> list[dict]:
    bundles = (
        await db.execute(
            select(AssetBundle)
            .where(AssetBundle.deleted_at.is_(None))
            .order_by(AssetBundle.name)
        )
    ).scalars().all()
    out = []
    for b in bundles:
        items = (
            await db.execute(
                select(Asset.id, Asset.asset_code, Asset.name, AssetBundleItem.quantity,
                       Asset.custody_type, Asset.condition)
                .join(AssetBundleItem, AssetBundleItem.asset_id == Asset.id)
                .where(AssetBundleItem.bundle_id == b.id, Asset.deleted_at.is_(None))
            )
        ).all()
        out.append({
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "items": [
                {
                    "id": i, "asset_code": c, "name": n, "quantity": q,
                    # Shown at selection time so nobody picks a kit half of
                    # which is already out.
                    "available": ct == "LOCATION" and cond == "OK",
                }
                for i, c, n, q, ct, cond in items
            ],
        })
    return out


async def create_bundle(db: AsyncSession, *, name, description, asset_ids, user_id):
    existing = (
        await db.execute(select(AssetBundle).where(AssetBundle.name == name))
    ).scalar_one_or_none()
    if existing:
        raise ConflictException(f"A kit named {name!r} already exists")
    bundle = AssetBundle(name=name, description=description)
    db.add(bundle)
    await db.flush()
    for aid in dict.fromkeys(asset_ids or []):
        db.add(AssetBundleItem(bundle_id=bundle.id, asset_id=aid))
    await record_audit(
        db, action="CREATE", entity_type="asset_bundle", entity_id=bundle.id,
        user_id=user_id, new_values={"name": name, "items": len(asset_ids or [])},
    )
    await db.commit()
    await db.refresh(bundle)
    return bundle


async def update_bundle(db: AsyncSession, bundle_id: UUID, *, name, description, asset_ids, user_id):
    from sqlalchemy import delete as sa_delete

    bundle = (
        await db.execute(
            select(AssetBundle).where(
                AssetBundle.id == bundle_id, AssetBundle.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not bundle:
        raise NotFoundException("Kit not found")
    if name:
        bundle.name = name
    if description is not None:
        bundle.description = description
    if asset_ids is not None:
        await db.execute(
            sa_delete(AssetBundleItem).where(AssetBundleItem.bundle_id == bundle.id)
        )
        for aid in dict.fromkeys(asset_ids):
            db.add(AssetBundleItem(bundle_id=bundle.id, asset_id=aid))
    await db.commit()
    await db.refresh(bundle)
    return bundle


async def delete_bundle(db: AsyncSession, bundle_id: UUID, user_id) -> None:
    bundle = (
        await db.execute(
            select(AssetBundle).where(
                AssetBundle.id == bundle_id, AssetBundle.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not bundle:
        raise NotFoundException("Kit not found")
    # Deleting a kit never touches the items in it — the kit is a shortcut for
    # picking, not a container that owns anything.
    bundle.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- returning: what actually came back -------------------------------------


async def resolve_item(
    db: AsyncSession,
    *,
    asset_id: UUID,
    outcome: str,
    note=None,
    site_location_id=None,
    customer_id=None,
    project_id=None,
    responsible_person_id=None,
    expected_return_date=None,
    user_id=None,
    commit: bool = True,
):
    """Say what happened to one item that went out.

    Ten items out and seven back is never "three missing". Each item is
    resolved explicitly, and each outcome moves custody somewhere real, so the
    system always knows where everything is.
    """
    if outcome not in RETURN_OUTCOMES:
        raise BadRequestException(f"outcome must be one of {sorted(RETURN_OUTCOMES)}")

    asset = (
        await db.execute(
            select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not asset:
        raise NotFoundException("Item not found")

    if outcome == OUTCOME_RETURNED:
        location_id = site_location_id or await cs.default_location_id(db)
        await cs.move_custody(
            db, asset, to_custody_type="LOCATION", to_custody_id=location_id,
            event_type="RETURNED", reason=note or "Returned to stock",
            user_id=user_id, commit=False,
        )
    elif outcome == OUTCOME_LEFT_AT_SITE:
        if not project_id:
            raise BadRequestException(
                "Which project is it left with? An item at a site nobody named "
                "is an item nobody can find."
            )
        await cs.move_custody(
            db, asset, to_custody_type="PROJECT", to_custody_id=project_id,
            event_type="LEFT_AT_SITE",
            reason=note or "Left at site, testing ongoing",
            expected_return_date=expected_return_date,
            user_id=user_id, commit=False,
        )
    elif outcome == OUTCOME_HANDED_TO_CUSTOMER:
        if not customer_id:
            raise BadRequestException("Which customer received it?")
        await cs.move_custody(
            db, asset, to_custody_type="CUSTOMER", to_custody_id=customer_id,
            event_type="GIVEN_TO_CUSTOMER", reason=note or "Handed to customer",
            user_id=user_id, commit=False,
        )
    elif outcome == OUTCOME_DAMAGED:
        location_id = site_location_id or await cs.default_location_id(db)
        await cs.move_custody(
            db, asset, to_custody_type="LOCATION", to_custody_id=location_id,
            event_type="RETURNED", reason=note or "Returned damaged",
            user_id=user_id, commit=False,
        )
        await cs.set_condition(
            db, asset, condition="DAMAGED", reason=note or "Damaged in the field",
            user_id=user_id, commit=False,
        )
    elif outcome == OUTCOME_LOST:
        await cs.set_condition(
            db, asset, condition="LOST", reason=note or "Not recovered",
            event_type="LOST", user_id=user_id, commit=False,
        )

    # Close the outward-form lines this item was out on. Custody says where
    # the thing is NOW; the movement item says how the trip ended — resolving
    # one without the other leaves the gate-pass list open forever.
    from datetime import datetime, timezone

    from modules.projects.models import EquipmentMovement, EquipmentMovementItem

    open_lines = (
        await db.execute(
            select(EquipmentMovementItem)
            .join(EquipmentMovement)
            .where(
                EquipmentMovementItem.asset_id == asset_id,
                EquipmentMovementItem.return_outcome.is_(None),
                EquipmentMovement.direction == "OUTWARD",
            )
        )
    ).scalars().all()
    for line in open_lines:
        line.return_outcome = outcome
        line.outcome_note = note
        line.resolved_at = datetime.now(timezone.utc)
        line.item_status = "RETURNED" if outcome == OUTCOME_RETURNED else (
            "DAMAGED" if outcome == OUTCOME_DAMAGED
            else "LOST" if outcome == OUTCOME_LOST
            else "WITH_CLIENT"
        )

    if commit:
        await db.commit()
        await db.refresh(asset)
    return asset


# --- repairs ----------------------------------------------------------------


async def report_damage(
    db: AsyncSession, *, asset_id, details, damage_location, responsible_person_id,
    project_id, damaged_at, user_id,
) -> AssetRepair:
    asset = (
        await db.execute(
            select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not asset:
        raise NotFoundException("Item not found")

    repair = AssetRepair(
        asset_id=asset_id, damage_details=details, damage_location=damage_location,
        responsible_person_id=responsible_person_id, project_id=project_id,
        damaged_at=damaged_at, reported_by=user_id, status="REPORTED",
    )
    db.add(repair)
    await db.flush()
    await cs.set_condition(
        db, asset, condition="DAMAGED", reason=details,
        source_type="asset_repair", source_id=repair.id, user_id=user_id, commit=False,
    )
    await db.commit()
    await db.refresh(repair)
    return repair


async def send_for_repair(
    db: AsyncSession, repair_id: UUID, *, vendor_id, cost, note, user_id
) -> AssetRepair:
    repair = await _repair_or_404(db, repair_id)
    if repair.status not in ("REPORTED",):
        raise ConflictException(f"This repair is already {repair.status.lower()}")

    repair.status = "SENT"
    repair.vendor_id = vendor_id
    repair.cost = cost
    repair.sent_at = datetime.now(timezone.utc)
    repair.is_repairable = True
    if note:
        repair.outcome_note = note

    asset = (await db.execute(select(Asset).where(Asset.id == repair.asset_id))).scalar_one()
    if vendor_id:
        await cs.move_custody(
            db, asset, to_custody_type="VENDOR", to_custody_id=vendor_id,
            event_type="SENT_FOR_REPAIR", reason=note or "Sent for repair",
            source_type="asset_repair", source_id=repair.id,
            user_id=user_id, commit=False,
        )
    await cs.set_condition(
        db, asset, condition="UNDER_REPAIR", reason=note or "Sent for repair",
        source_type="asset_repair", source_id=repair.id, user_id=user_id, commit=False,
    )
    await db.commit()
    await db.refresh(repair)
    return repair


async def complete_repair(
    db: AsyncSession, repair_id: UUID, *, repaired: bool, cost, note,
    return_location_id, user_id,
) -> AssetRepair:
    """Back in service, or written off. Either way the item stops being a
    question mark."""
    repair = await _repair_or_404(db, repair_id)
    if repair.status == "RETURNED":
        raise ConflictException("This repair is already closed")

    repair.status = "RETURNED" if repaired else "IRREPARABLE"
    repair.is_repairable = repaired
    repair.received_at = datetime.now(timezone.utc)
    if cost is not None:
        repair.cost = cost
    if note:
        repair.outcome_note = note

    asset = (await db.execute(select(Asset).where(Asset.id == repair.asset_id))).scalar_one()
    if repaired:
        await cs.move_custody(
            db, asset, to_custody_type="LOCATION",
            to_custody_id=return_location_id or await cs.default_location_id(db),
            event_type="REPAIRED", reason=note or "Back from repair",
            source_type="asset_repair", source_id=repair.id,
            user_id=user_id, commit=False,
        )
        await cs.set_condition(
            db, asset, condition="OK", reason=note or "Repaired",
            event_type="REPAIRED", source_type="asset_repair", source_id=repair.id,
            user_id=user_id, commit=False,
        )
    else:
        await cs.set_condition(
            db, asset, condition="RETIRED", reason=note or "Beyond repair",
            source_type="asset_repair", source_id=repair.id,
            user_id=user_id, commit=False,
        )
    await db.commit()
    await db.refresh(repair)
    return repair


async def _repair_or_404(db: AsyncSession, repair_id: UUID) -> AssetRepair:
    repair = (
        await db.execute(
            select(AssetRepair).where(
                AssetRepair.id == repair_id, AssetRepair.deleted_at.is_(None)
            )
        )
    ).scalar_one_or_none()
    if not repair:
        raise NotFoundException("Repair not found")
    return repair


async def list_repairs(db: AsyncSession, *, status=None, limit: int = 200) -> list[dict]:
    stmt = (
        select(AssetRepair, Asset.asset_code, Asset.name)
        .join(Asset, Asset.id == AssetRepair.asset_id)
        .where(AssetRepair.deleted_at.is_(None))
        .order_by(AssetRepair.created_at.desc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(AssetRepair.status == status)
    out = []
    for repair, code, name in (await db.execute(stmt)).all():
        item = {c.name: getattr(repair, c.name) for c in repair.__table__.columns}
        item["asset_code"] = code
        item["asset_name"] = name
        item["responsible_name"] = await _person_name(db, repair.responsible_person_id)
        out.append(item)
    return out
