"""Where a thing is, who is answerable for it, and what state it is in.

Three axes rather than one `status` enum. The old column crammed all three
together, which is why "damaged, and still at the customer's site" or "at the
Halol factory" could not be expressed — see docs/PLAN.md §3.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin

# Who or what can hold an item.
CUSTODY_LOCATION = "LOCATION"
CUSTODY_PERSON = "PERSON"
CUSTODY_PROJECT = "PROJECT"
CUSTODY_CUSTOMER = "CUSTOMER"
CUSTODY_VENDOR = "VENDOR"
# "We do not know." A real state, and the only honest one for an item the old
# model recorded as deployed to nothing. Saying it is in the office would be a
# claim; UNKNOWN is a question the Inventory Manager can answer.
CUSTODY_UNKNOWN = "UNKNOWN"

CUSTODY_TYPES = (
    CUSTODY_LOCATION,
    CUSTODY_PERSON,
    CUSTODY_PROJECT,
    CUSTODY_CUSTOMER,
    CUSTODY_VENDOR,
    CUSTODY_UNKNOWN,
)

# What state it is in. Orthogonal to custody: an item can be damaged anywhere.
CONDITION_OK = "OK"
CONDITION_DAMAGED = "DAMAGED"
CONDITION_UNDER_REPAIR = "UNDER_REPAIR"
CONDITION_LOST = "LOST"
CONDITION_RETIRED = "RETIRED"

CONDITIONS = (
    CONDITION_OK,
    CONDITION_DAMAGED,
    CONDITION_UNDER_REPAIR,
    CONDITION_LOST,
    CONDITION_RETIRED,
)


class StockLocation(Base, SoftDeleteMixin):
    """A place the company keeps things. Data, not an enum.

    Office, R&D, Storeroom and the Halol factory are seeded; the Inventory
    Manager adds the rest.
    """

    __tablename__ = "stock_locations"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(30), default="OFFICE", nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # The place a returned item goes when nothing more specific is known.
    is_default: Mapped[bool] = mapped_column(default=False, nullable=False)


class Customer(Base, SoftDeleteMixin):
    """An organisation we hand equipment to — for a POC, or as goodwill.

    Needed so "given to the customer" points at something. Without it, giving
    an item away means deleting it, and the history goes with it.
    """

    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Vendor(Base, SoftDeleteMixin):
    """Someone who repairs or supplies equipment."""

    __tablename__ = "vendors"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class AssetMovement(Base):
    """Append-only. Every custody or condition change, and why.

    The columns on `assets` are a cache of the newest row here. Keeping the
    ledger authoritative means the current state can always be reconciled
    against how it got there, and that history cannot be edited away by an
    update to the asset.
    """

    __tablename__ = "asset_movements"

    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # What kind of event: RECEIVED, MOVED, ISSUED, RETURNED, HANDED_OVER,
    # LEFT_AT_SITE, GIVEN_TO_CUSTOMER, SENT_FOR_REPAIR, REPAIRED,
    # DAMAGED, LOST, RETIRED, ADJUSTED.
    event_type: Mapped[str] = mapped_column(String(30), index=True, nullable=False)

    from_custody_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    from_custody_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    to_custody_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    to_custody_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )

    from_condition: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    to_condition: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # The thing that caused this, when there is one: an equipment movement, a
    # handover, a repair. Polymorphic because those are different tables and a
    # column per source would be mostly nulls.
    source_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    source_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)

    performed_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
