from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Float, String, Text, Boolean, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin


class Location(Base):
    __tablename__ = "locations"

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    coordinate = Column(Geometry("POINT", srid=4326), nullable=True)
    address_note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)


class LocationHistory(Base, CustomFieldsMixin):
    __tablename__ = "location_history"

    couple_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), index=True, nullable=False
    )
    old_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    old_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    new_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    new_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    moved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    handled_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    had_rf: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    distance_meters: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fitting_materials_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    configuration_snapshot: Mapped[Optional[dict]] = mapped_column(
        JSONB, nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)