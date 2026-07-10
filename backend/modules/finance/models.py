from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class ExpenseBatch(Base, SoftDeleteMixin):
    """Optional grouping: one bill submitted by a lead covering several expenses."""

    __tablename__ = "expense_batches"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)


class FundAllocation(Base, SoftDeleteMixin):
    """Money handed to a person from the office (an advance). The person's
    running balance = sum(advances) − sum(their expenses) for the same scope."""

    __tablename__ = "fund_allocations"

    person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), index=True, nullable=False
    )
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    received_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    source_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logged_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    person = relationship("Person", lazy="selectin")


class ExpenseClaim(Base, SoftDeleteMixin):
    """A team lead bundles several people's expenses for a project and submits
    them to the finance department, who marks the claim paid."""

    __tablename__ = "expense_claims"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True
    )
    submitted_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="DRAFT", nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settled_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class Expense(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "expenses"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    expense_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    project_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True, index=True
    )
    batch_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("expense_batches.id"), nullable=True
    )
    claim_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("expense_claims.id"), nullable=True, index=True
    )
    added_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SUBMITTED", nullable=False)
    paid_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    members = relationship("ExpenseMember", lazy="selectin", back_populates="expense")


class ExpenseMember(Base):
    """Who was included in this bill (e.g. team dinner split)."""

    __tablename__ = "expense_members"

    expense_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("expenses.id"), index=True, nullable=False
    )
    person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=False
    )

    expense = relationship("Expense", back_populates="members")
    person = relationship("Person", lazy="selectin")
