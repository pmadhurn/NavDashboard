"""Outward movements get a purpose and can stand alone

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-08-12

Equipment also leaves the office for testing, POCs and demos — trips that
have no project. `project_id` becomes nullable; `purpose` says why it left
(DEPLOYMENT | TESTING | POC | OTHER, and DEPLOYMENT still requires a
project, enforced in the service); `expected_return_date` makes "overdue"
answerable per outward form, not just per item.
"""
from alembic import op
import sqlalchemy as sa

revision = "c2d3e4f5a6b7"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("equipment_movements", "project_id", nullable=True)
    op.add_column(
        "equipment_movements",
        sa.Column("purpose", sa.String(20), nullable=False,
                  server_default="DEPLOYMENT"),
    )
    op.add_column(
        "equipment_movements",
        sa.Column("expected_return_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("equipment_movements", "expected_return_date")
    op.drop_column("equipment_movements", "purpose")
    # Rows without a project must be deleted before this can be reinstated.
    op.alter_column("equipment_movements", "project_id", nullable=False)
