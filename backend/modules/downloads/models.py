from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, SoftDeleteMixin


class DownloadCategory(Base):
    __tablename__ = "download_categories"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class DownloadItem(Base, SoftDeleteMixin):
    __tablename__ = "download_items"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("download_categories.id"), nullable=True
    )
    item_type: Mapped[str] = mapped_column(String(20), default="FILE", nullable=False)
    visibility: Mapped[str] = mapped_column(String(20), default="PUBLIC", nullable=False)
    tags: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    uploaded_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    category = relationship("DownloadCategory", lazy="selectin")
    versions = relationship(
        "DownloadVersion",
        lazy="selectin",
        order_by="DownloadVersion.created_at.desc()",
        back_populates="item",
    )


class DownloadVersion(Base):
    __tablename__ = "download_versions"

    item_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("download_items.id"), index=True, nullable=False
    )
    version_label: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    release_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    item = relationship("DownloadItem", back_populates="versions")


class DownloadItemAccess(Base):
    __tablename__ = "download_item_access"
    __table_args__ = (
        UniqueConstraint("item_id", "user_id", name="uq_download_access_item_user"),
    )

    item_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("download_items.id"), index=True, nullable=False
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
