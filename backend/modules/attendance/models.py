from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base, SoftDeleteMixin

# One row per person per day. A multi-day site trip is N rows of ON_FIELD, which
# keeps "how many field days in July" a COUNT(*) rather than an interval
# intersection, and survives a holiday falling in the middle of the trip.
DAY_TYPES = (
    "ON_FIELD",       # at a site; departed_at / completed_at bracket the work
    "IN_OFFICE",
    "AT_HOME",        # no site work available
    "HOLIDAY",        # company holiday
    "LEAVE",          # personal leave
    "COMP_OFF_TAKEN",  # spending accrued comp-off
)

COMP_OFF_ENTRY_TYPES = ("ACCRUED", "CONSUMED", "ADJUSTED")


class AttendanceDay(Base, SoftDeleteMixin):
    __tablename__ = "attendance_days"
    __table_args__ = (
        Index(
            "uq_attendance_person_day",
            "person_id",
            "day",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=False
    )
    day: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    day_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Required when ON_FIELD: a field day that names no project cannot be
    # reconciled against the project it was worked on.
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True
    )
    phase_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("project_phases.id"), nullable=True
    )

    departed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    logged_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )


class CompOffLedger(Base):
    """Append-only comp-off movements. Balance is SUM(days).

    A ledger rather than a counter on `personnel`: the requirement is to track
    accrual *and* consumption, and a counter cannot answer "which Saturdays
    earned this". It also means a policy change is new rows, not a migration.
    """

    __tablename__ = "comp_off_ledger"

    person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=False
    )
    entry_type: Mapped[str] = mapped_column(String(10), nullable=False)
    # Signed: +1.0 accrued, -1.0 consumed. Numeric, not float — a balance that
    # drifts by 0.30000000000000004 is a support ticket.
    days: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    source_day_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("attendance_days.id"), nullable=True
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
