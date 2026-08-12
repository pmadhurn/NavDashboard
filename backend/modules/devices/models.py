from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func, Index, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    # Which product this unit is: OpticSpectra 1G vs 10G, an RF model, a gyro
    # model. Data, not an enum — new versions arrive without a deploy.
    # Attribute named device_model_id because pydantic reserves the model_*
    # namespace; the column keeps the plain name.
    device_model_id: Mapped[Optional[UUID]] = mapped_column(
        "model_id", PG_UUID(as_uuid=True), ForeignKey("device_models.id"), nullable=True
    )

    device_model = relationship("DeviceModel", lazy="selectin")

    @property
    def device_model_name(self) -> Optional[str]:
        return self.device_model.name if self.device_model else None


class DeviceModel(Base):
    """A product/version the company stocks: OpticSpectra 1G, OpticSpectra 10G,
    an RF unit model, a gyro model. The Inventory or device team extends the
    list from the device form itself."""

    __tablename__ = "device_models"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    # Which device type it applies to (IU/OU/HC/RF/GYRO/GYRO_CTRL); NULL = any.
    device_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


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