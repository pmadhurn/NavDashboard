"""Drop assets.status

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-08-12

Phase 1 split this single enum into custody_type/custody_id, condition and a
derived availability, and kept the column for one release so anything still
reading it would not break. Phase 3 migrated the last readers and removed it
from the write surface; nothing has read it for a decision since.

Keeping a column that nothing reads but a mirror still writes is how a second
source of truth grows back.
"""
from alembic import op
import sqlalchemy as sa

revision = "e8f9a0b1c2d3"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("assets", "status")


def downgrade() -> None:
    # Recreated with the value custody implies. The original per-row history is
    # in asset_movements, which is where it belongs.
    op.add_column(
        "assets",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="IN_OFFICE"),
    )
    op.execute(
        "UPDATE assets SET status = CASE "
        "WHEN condition IN ('DAMAGED','UNDER_REPAIR','RETIRED') THEN 'DAMAGED' "
        "WHEN condition = 'LOST' THEN 'LOST' "
        "WHEN custody_type = 'PERSON' THEN 'WITH_PERSON' "
        "WHEN custody_type IN ('PROJECT','CUSTOMER','UNKNOWN') THEN 'DEPLOYED' "
        "ELSE 'IN_OFFICE' END"
    )
