"""Per-category serial policy

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-08-12

The Inventory Manager decides which categories must carry a serial number
(indoor/outdoor units, RF, hybrid cables, switches) and which must never nag
for one (patch cords, small consumables). One boolean on the category; the
server enforces it wherever an asset is written.
"""
from alembic import op
import sqlalchemy as sa

revision = "b1c2d3e4f5a6"
down_revision = "a0b1c2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "asset_categories",
        sa.Column("requires_serial", sa.Boolean(), nullable=False,
                  server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("asset_categories", "requires_serial")
