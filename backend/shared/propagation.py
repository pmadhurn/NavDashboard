"""
Cascading status propagation: Device → Couple → Pair.

Status priority: FAULTY > NOT_WORKING > WORKING.
If any child is FAULTY, the parent becomes FAULTY.
If any child is NOT_WORKING, the parent becomes NOT_WORKING.
Otherwise, the parent is WORKING.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def derive_status_from_children(statuses: list[str]) -> str:
    """Derive a parent status from its children's statuses using priority rules."""
    for s in statuses:
        if s == "FAULTY":
            return "FAULTY"
    for s in statuses:
        if s == "NOT_WORKING":
            return "NOT_WORKING"
    return "WORKING"


async def propagate_device_status_change(db: AsyncSession, device) -> None:
    """After a device status changes, auto-derive its couple's status, then cascade to pair."""
    if not device.couple_id:
        return

    from modules.couples.models import Couple
    from modules.devices.models import Device

    # Fetch the couple
    couple_stmt = select(Couple).where(
        Couple.id == device.couple_id, Couple.deleted_at.is_(None)
    )
    couple_result = await db.execute(couple_stmt)
    couple = couple_result.scalar_one_or_none()
    if not couple:
        return

    # Fetch all devices belonging to this couple
    devices_stmt = select(Device).where(
        Device.couple_id == couple.id, Device.deleted_at.is_(None)
    )
    devices_result = await db.execute(devices_stmt)
    devices = list(devices_result.scalars().all())

    device_statuses = [d.status for d in devices]
    derived = derive_status_from_children(device_statuses) if device_statuses else "WORKING"

    if couple.status != derived:
        couple.status = derived
        await db.flush()

    # Now cascade to the pair
    await propagate_couple_status_change(db, couple)


async def propagate_couple_status_change(db: AsyncSession, couple) -> None:
    """After a couple status changes, auto-derive its pair's status (respecting override)."""
    if not couple.pair_id:
        return

    from modules.couples.models import Couple
    from modules.pairs.models import Pair

    # Fetch the pair
    pair_stmt = select(Pair).where(
        Pair.id == couple.pair_id, Pair.deleted_at.is_(None)
    )
    pair_result = await db.execute(pair_stmt)
    pair = pair_result.scalar_one_or_none()
    if not pair:
        return

    # Respect manual override
    if pair.status_override:
        return

    # Fetch all couples belonging to this pair
    couples_stmt = select(Couple).where(
        Couple.pair_id == pair.id, Couple.deleted_at.is_(None)
    )
    couples_result = await db.execute(couples_stmt)
    couples = list(couples_result.scalars().all())

    couple_statuses = [c.status for c in couples]
    derived = derive_status_from_children(couple_statuses) if couple_statuses else "WORKING"

    if pair.status != derived:
        pair.status = derived
        await db.flush()
