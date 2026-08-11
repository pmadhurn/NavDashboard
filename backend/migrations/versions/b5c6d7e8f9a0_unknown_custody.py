"""Mark orphaned deployments UNKNOWN rather than asserting they are in the office

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
Create Date: 2026-08-11

The custody migration fell back to Office for anything it could not place. For
rows the old model recorded as DEPLOYED with no project and no person, that is
a false claim: the item is not in the office, we do not know where it is.

UNKNOWN says so, and puts the item in front of the Inventory Manager as
something to resolve instead of burying it in a stock count.
"""
from alembic import op
import sqlalchemy as sa

revision = "b5c6d7e8f9a0"
down_revision = "a4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    office_id = conn.execute(
        sa.text("SELECT id FROM stock_locations WHERE name = 'Office'")
    ).scalar_one_or_none()
    if office_id is None:
        return

    # Only the rows this actually applies to: out-of-office statuses that the
    # custody migration could not resolve to a project or a person.
    result = conn.execute(
        sa.text(
            "UPDATE assets SET custody_type = 'UNKNOWN', custody_id = NULL "
            "WHERE deleted_at IS NULL "
            "AND custody_type = 'LOCATION' AND custody_id = :office "
            "AND status IN ('DEPLOYED', 'WITH_PERSON', 'IN_TRANSIT') "
            "AND current_project_id IS NULL AND current_person_id IS NULL "
            "RETURNING id"
        ),
        {"office": office_id},
    )
    ids = [row[0] for row in result]
    for asset_id in ids:
        conn.execute(
            sa.text(
                "INSERT INTO asset_movements "
                "(id, asset_id, event_type, to_custody_type, quantity, reason, "
                " occurred_at, created_at) "
                "VALUES (gen_random_uuid(), :a, 'NEEDS_RECONCILIATION', 'UNKNOWN', 1, "
                " 'Recorded as deployed with no project or person. Location "
                "unknown — please confirm where this item is.', now(), now())"
            ),
            {"a": asset_id},
        )


def downgrade() -> None:
    pass
