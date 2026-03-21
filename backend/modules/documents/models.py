from typing import Optional
from uuid import UUID

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin


class Document(Base, SoftDeleteMixin):
    __tablename__ = "documents"

    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    uploaded_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)