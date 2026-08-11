"""Handovers, kits and repairs — the things that move equipment around.

All three write to `asset_movements` when they take effect, so an item's
history is one story regardless of which workflow produced each line.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin

HANDOVER_PENDING = "PENDING"
HANDOVER_ACCEPTED = "ACCEPTED"
HANDOVER_REJECTED = "REJECTED"
HANDOVER_CANCELLED = "CANCELLED"

HANDOVER_STATUSES = (
    HANDOVER_PENDING,
    HANDOVER_ACCEPTED,
    HANDOVER_REJECTED,
    HANDOVER_CANCELLED,
)

# How an item taken out was resolved when the team came back. The whole point:
# "not returned" is never the same as "missing".
OUTCOME_RETURNED = "RETURNED"
OUTCOME_LEFT_AT_SITE = "LEFT_AT_SITE"
OUTCOME_HANDED_TO_CUSTOMER = "HANDED_TO_CUSTOMER"
OUTCOME_DAMAGED = "DAMAGED"
OUTCOME_LOST = "LOST"

RETURN_OUTCOMES = (
    OUTCOME_RETURNED,
    OUTCOME_LEFT_AT_SITE,
    OUTCOME_HANDED_TO_CUSTOMER,
    OUTCOME_DAMAGED,
    OUTCOME_LOST,
)

REPAIR_REPORTED = "REPORTED"
REPAIR_SENT = "SENT"
REPAIR_RETURNED = "RETURNED"
REPAIR_IRREPARABLE = "IRREPARABLE"

REPAIR_STATUSES = (REPAIR_REPORTED, REPAIR_SENT, REPAIR_RETURNED, REPAIR_IRREPARABLE)


class AssetHandover(Base, SoftDeleteMixin):
    """One person passing items to another.

    Custody does NOT move when this is created. It moves when the receiver
    accepts. Anything else lets someone rid themselves of responsibility for a
    laptop by naming a colleague who never agreed to take it.
    """

    __tablename__ = "asset_handovers"

    from_person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=False
    )
    to_person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=HANDOVER_PENDING, index=True, nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Why the receiver said no. Without it a rejection is a dead end.
    response_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    initiated_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    responded_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class AssetHandoverItem(Base):
    __tablename__ = "asset_handover_items"

    handover_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("asset_handovers.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class AssetBundle(Base, SoftDeleteMixin):
    """A named set normally taken together — a Troubleshooting Kit, say.

    A convenience for selection only. Issuing a bundle expands it into its
    individual items, so per-item tracking never depends on the bundle staying
    intact; one item can be damaged or handed on without breaking the rest.
    """

    __tablename__ = "asset_bundles"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AssetBundleItem(Base):
    __tablename__ = "asset_bundle_items"

    bundle_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("asset_bundles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class AssetRepair(Base, SoftDeleteMixin):
    """Damage reported, sent out, and what came back.

    Kept as its own record rather than a note on the asset because a repair has
    its own life — a vendor, a cost, two dates — and an item can go through
    several over its lifetime.
    """

    __tablename__ = "asset_repairs"

    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), index=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=REPAIR_REPORTED, index=True, nullable=False
    )
    damage_details: Mapped[str] = mapped_column(Text, nullable=False)
    damaged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Where it happened and who had it — recorded at report time, because by
    # the time anyone asks, the item has usually moved.
    damage_location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    responsible_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=True
    )
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )

    is_repairable: Mapped[Optional[bool]] = mapped_column(nullable=True)
    vendor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True
    )
    cost: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    received_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    outcome_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    reported_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
