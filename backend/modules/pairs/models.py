from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class Pair(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "pairs"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="WORKING")
    status_override: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    handling_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)