"""Required items — the list that answers "what do we need to buy?".

Anyone can ask for something; the Inventory Manager runs it through a small,
explicit lifecycle; Finance reads the same list to plan the money. This is
deliberately NOT a purchase-order system — no line-item accounting, no GRNs —
because the office problem being solved is "the boss asks what is needed and
someone scrambles", not procurement compliance.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, SoftDeleteMixin

# The lifecycle. REJECTED is terminal but visible — a refused request that
# disappears will simply be asked again.
REQUEST_REQUESTED = "REQUESTED"
REQUEST_APPROVED = "APPROVED"
REQUEST_ORDERED = "ORDERED"
REQUEST_RECEIVED = "RECEIVED"
REQUEST_REJECTED = "REJECTED"

REQUEST_STATUSES = (
    REQUEST_REQUESTED,
    REQUEST_APPROVED,
    REQUEST_ORDERED,
    REQUEST_RECEIVED,
    REQUEST_REJECTED,
)

# Which moves are legal from where. Terminal states allow nothing.
REQUEST_TRANSITIONS: dict[str, tuple[str, ...]] = {
    REQUEST_REQUESTED: (REQUEST_APPROVED, REQUEST_ORDERED, REQUEST_REJECTED),
    REQUEST_APPROVED: (REQUEST_ORDERED, REQUEST_RECEIVED, REQUEST_REJECTED),
    REQUEST_ORDERED: (REQUEST_RECEIVED, REQUEST_REJECTED),
    REQUEST_RECEIVED: (),
    REQUEST_REJECTED: (),
}


class ItemRequest(Base, SoftDeleteMixin):
    __tablename__ = "item_requests"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    needed_by: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default=REQUEST_REQUESTED, nullable=False, index=True
    )

    requested_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Optional, never compulsory: where it would be bought and roughly what it
    # costs — the two facts Finance wants next to the title.
    vendor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True
    )
    estimated_cost: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    # Filled at each status change: "ordered from X", "refused: already have 3".
    status_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    vendor = relationship("Vendor", lazy="selectin")
