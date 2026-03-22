from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Text, func, Index, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin, CustomFieldsMixin


class Device(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "devices"
    __table_args__ = (
        Index(
            "ix_devices_serial_number_not_deleted",
            "serial_number",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    serial_number: Mapped[str] = mapped_column(
        String(50), index=True, nullable=False
    )
    device_type: Mapped[str] = mapped_column(String(10), nullable=False)
    couple_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )  # FK added in Phase 6 when couples table exists
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="WORKING"
    )
    handling_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )  # FK added in Phase 5
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class DeviceStatusHistory(Base):
    __tablename__ = "device_status_history"

    device_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    old_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)