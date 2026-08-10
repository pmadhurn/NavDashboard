from __future__ import annotations

from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin


class DailyUpdate(Base, SoftDeleteMixin):
    """One person's report on one day.

    `posted_for` is the day being reported on, deliberately separate from
    `created_at`: someone writing up Friday's site work on Monday morning should
    have it filed under Friday.
    """

    __tablename__ = "daily_updates"

    author_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False
    )
    # Denormalised from the author's login so team filters and the leadership
    # view can group by person without joining through users every time.
    person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=True
    )
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    posted_for: Mapped[date] = mapped_column(Date, index=True, nullable=False)


class UpdateComment(Base, SoftDeleteMixin):
    """A reply on an update. Deleting the update cascades to its thread.

    A dedicated table rather than the polymorphic project timeline: updates are
    person-scoped, dated and threaded, and overloading the timeline would put
    comments on projects that have none. A generic comments(entity_type,
    entity_id) table has no second consumer yet, and this codebase already has
    four unconstrained polymorphic tables.
    """

    __tablename__ = "update_comments"

    update_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("daily_updates.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    author_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
