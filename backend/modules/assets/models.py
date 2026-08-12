from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # The Inventory Manager's call, per category: indoor/outdoor units and RF
    # must carry a serial; patch cords and small items must not nag for one.
    requires_serial: Mapped[bool] = mapped_column(default=False, nullable=False)


class Asset(Base, SoftDeleteMixin, CustomFieldsMixin):
    """Any physical item the office tracks: equipment, cables, tools, devices.

    `tag_identifiers` reserves a place for barcode/QR/RFID values so future
    scanning integrations need no schema change: {"barcode": ..., "qr": ..., "rfid": ...}
    """

    __tablename__ = "assets"

    asset_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    category_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=True
    )
    item_kind: Mapped[str] = mapped_column(String(20), default="SERIALIZED", nullable=False)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    current_project_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    current_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=True
    )
    device_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    purchase_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    # Where it was bought. Optional on purpose — better recorded late than
    # blocking the person adding the item.
    vendor_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    tag_identifiers: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # --- custody, condition (Phase 1) --------------------------------------
    # Three independent facts, replacing the single `status` enum. `status` is
    # still written for one release so anything still reading it keeps working;
    # Phase 2 drops it.
    custody_type: Mapped[str] = mapped_column(
        String(20), default="LOCATION", nullable=False, index=True
    )
    # Points into stock_locations / personnel / projects / customers / vendors
    # depending on custody_type. Unconstrained by necessity — a foreign key
    # cannot target five tables — so custody_type is what makes it meaningful.
    custody_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    condition: Mapped[str] = mapped_column(
        String(20), default="OK", nullable=False, index=True
    )
    # Set when something is out and expected back, so "overdue" is answerable.
    expected_return_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    category = relationship("AssetCategory", lazy="selectin")
    current_person = relationship("Person", lazy="selectin")


class AssetHistory(Base):
    __tablename__ = "asset_history"

    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), index=True, nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    old_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    new_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    project_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    person_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performed_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AssetReport(Base, SoftDeleteMixin):
    """Damaged-item reports and new-requirement requests."""

    __tablename__ = "asset_reports"

    report_type: Mapped[str] = mapped_column(String(20), nullable=False)  # DAMAGED | REQUIREMENT
    asset_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reported_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    asset = relationship("Asset", lazy="selectin")
