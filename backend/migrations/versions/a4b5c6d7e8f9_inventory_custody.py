"""Inventory custody: locations, customers, vendors, the movement ledger

Revision ID: a4b5c6d7e8f9
Revises: f3a4b5c6d7e8
Create Date: 2026-08-11

Splits `assets.status` into three independent facts — custody_type/custody_id,
condition, and (derived, not stored) availability. See docs/PLAN.md §3.

`status` is NOT dropped here. Anything still reading it keeps working for one
release, and a rollback stays possible; Phase 2 removes it once nothing does.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a4b5c6d7e8f9"
down_revision = "f3a4b5c6d7e8"
branch_labels = None
depends_on = None

SEED_LOCATIONS = [
    ("Office", "OFFICE", True, 0),
    ("R&D", "DEPARTMENT", False, 1),
    ("Storeroom", "STORE", False, 2),
    ("Halol Factory", "FACTORY", False, 3),
]


def _party_table(name: str) -> None:
    op.create_table(
        name,
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
        sa.Column("contact_name", sa.String(length=200), nullable=True),
        sa.Column("contact_phone", sa.String(length=50), nullable=True),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def upgrade() -> None:
    op.create_table(
        "stock_locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("kind", sa.String(length=30), nullable=False, server_default="OFFICE"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    _party_table("customers")
    _party_table("vendors")

    op.add_column("assets", sa.Column("custody_type", sa.String(length=20), nullable=False, server_default="LOCATION"))
    op.add_column("assets", sa.Column("custody_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("assets", sa.Column("condition", sa.String(length=20), nullable=False, server_default="OK"))
    op.add_column("assets", sa.Column("expected_return_date", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_assets_custody_type", "assets", ["custody_type"])
    op.create_index("ix_assets_custody_id", "assets", ["custody_id"])
    op.create_index("ix_assets_condition", "assets", ["condition"])

    op.create_table(
        "asset_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "asset_id", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("assets.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("event_type", sa.String(length=30), nullable=False),
        sa.Column("from_custody_type", sa.String(length=20), nullable=True),
        sa.Column("from_custody_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("to_custody_type", sa.String(length=20), nullable=True),
        sa.Column("to_custody_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("from_condition", sa.String(length=20), nullable=True),
        sa.Column("to_condition", sa.String(length=20), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=40), nullable=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "performed_by", postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"), nullable=True,
        ),
        sa.Column(
            "occurred_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True),
            server_default=sa.func.now(), nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_asset_movements_asset_id", "asset_movements", ["asset_id"])
    op.create_index("ix_asset_movements_event_type", "asset_movements", ["event_type"])
    op.create_index("ix_asset_movements_occurred_at", "asset_movements", ["occurred_at"])

    _migrate_existing()


def _migrate_existing() -> None:
    """Translate `status` + current_person_id + current_project_id into custody.

    Order matters: person and project are more specific than a bare status, so
    they are applied last and win. An item recorded as DEPLOYED *and* held by a
    named person is with that person — the person is the answerable party.
    """
    conn = op.get_bind()

    for name, kind, is_default, order in SEED_LOCATIONS:
        conn.execute(
            sa.text(
                "INSERT INTO stock_locations (id, name, kind, is_default, sort_order, created_at) "
                "VALUES (gen_random_uuid(), :n, :k, :d, :o, now()) "
                "ON CONFLICT (name) DO NOTHING"
            ),
            {"n": name, "k": kind, "d": is_default, "o": order},
        )

    office_id = conn.execute(
        sa.text("SELECT id FROM stock_locations WHERE name = 'Office'")
    ).scalar_one()

    # Everything starts in the office; the more specific rules below correct it.
    conn.execute(
        sa.text(
            "UPDATE assets SET custody_type = 'LOCATION', custody_id = :loc "
            "WHERE custody_id IS NULL"
        ),
        {"loc": office_id},
    )
    conn.execute(
        sa.text(
            "UPDATE assets SET custody_type = 'PROJECT', custody_id = current_project_id "
            "WHERE current_project_id IS NOT NULL"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE assets SET custody_type = 'PERSON', custody_id = current_person_id "
            "WHERE current_person_id IS NOT NULL"
        )
    )
    # The old enum carried one condition value among its location values.
    conn.execute(
        sa.text("UPDATE assets SET condition = 'DAMAGED' WHERE status = 'DAMAGED'")
    )
    conn.execute(
        sa.text("UPDATE assets SET condition = 'LOST' WHERE status = 'LOST'")
    )

    # One opening ledger row per asset, so no item has a custody with no history.
    conn.execute(
        sa.text(
            "INSERT INTO asset_movements "
            "(id, asset_id, event_type, to_custody_type, to_custody_id, "
            " to_condition, quantity, reason, occurred_at, created_at) "
            "SELECT gen_random_uuid(), a.id, 'OPENING_BALANCE', a.custody_type, "
            "       a.custody_id, a.condition, COALESCE(a.quantity, 1), "
            "       'Position at the time custody tracking began', "
            "       COALESCE(a.created_at, now()), now() "
            "FROM assets a WHERE a.deleted_at IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_asset_movements_occurred_at", table_name="asset_movements")
    op.drop_index("ix_asset_movements_event_type", table_name="asset_movements")
    op.drop_index("ix_asset_movements_asset_id", table_name="asset_movements")
    op.drop_table("asset_movements")
    op.drop_index("ix_assets_condition", table_name="assets")
    op.drop_index("ix_assets_custody_id", table_name="assets")
    op.drop_index("ix_assets_custody_type", table_name="assets")
    for col in ("expected_return_date", "condition", "custody_id", "custody_type"):
        op.drop_column("assets", col)
    op.drop_table("vendors")
    op.drop_table("customers")
    op.drop_table("stock_locations")
