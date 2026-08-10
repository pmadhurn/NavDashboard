"""attendance_days + comp_off_ledger

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-08-11

One row per person per day. A multi-day site trip is N rows of ON_FIELD, which
keeps "how many field days in July" a COUNT(*) instead of an interval
intersection, and survives a holiday falling inside the trip.

The uniqueness constraint is partial (WHERE deleted_at IS NULL) so that a
soft-deleted day does not block re-logging the same date.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "attendance_days",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("personnel.id"),
            nullable=False,
        ),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("day_type", sa.String(length=20), nullable=False),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id"),
            nullable=True,
        ),
        sa.Column(
            "phase_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("project_phases.id"),
            nullable=True,
        ),
        sa.Column("departed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "logged_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_attendance_days_person_id", "attendance_days", ["person_id"])
    op.create_index("ix_attendance_days_day", "attendance_days", ["day"])
    op.create_index(
        "uq_attendance_person_day",
        "attendance_days",
        ["person_id", "day"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "comp_off_ledger",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("personnel.id"),
            nullable=False,
        ),
        sa.Column("entry_type", sa.String(length=10), nullable=False),
        # Signed and Numeric: +1.0 accrued, -1.0 consumed, balance = SUM(days).
        sa.Column("days", sa.Numeric(4, 2), nullable=False),
        sa.Column(
            "source_day_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("attendance_days.id"),
            nullable=True,
        ),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_comp_off_ledger_person_id", "comp_off_ledger", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_comp_off_ledger_person_id", table_name="comp_off_ledger")
    op.drop_table("comp_off_ledger")
    op.drop_index("uq_attendance_person_day", table_name="attendance_days")
    op.drop_index("ix_attendance_days_day", table_name="attendance_days")
    op.drop_index("ix_attendance_days_person_id", table_name="attendance_days")
    op.drop_table("attendance_days")
