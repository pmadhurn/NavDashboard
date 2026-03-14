from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class FittingMaterial(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "fitting_materials"

    couple_id: Mapped[Optional[UUID]] = mapped_column(nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class MaterialTemplate(Base):
    __tablename__ = "material_templates"

    template_name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    materials: Mapped[dict] = mapped_column(JSONB, nullable=False)