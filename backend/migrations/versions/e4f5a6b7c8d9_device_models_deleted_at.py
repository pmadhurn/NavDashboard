"""device_models missed the Base deleted_at column

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-08-14

Every table inherits `deleted_at` from the declarative Base, so the ORM
references it on every select; the hand-written device_models migration
left it out and GET /devices/models 500'd on the deployed stack.
"""
from alembic import op
import sqlalchemy as sa

revision = "e4f5a6b7c8d9"
down_revision = "d3e4f5a6b7c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "device_models",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("device_models", "deleted_at")
