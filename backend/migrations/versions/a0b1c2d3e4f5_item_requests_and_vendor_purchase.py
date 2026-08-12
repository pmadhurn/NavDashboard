"""Required items list, vendor on purchase, and the stock.* grant gap

Revision ID: a0b1c2d3e4f5
Revises: e8f9a0b1c2d3
Create Date: 2026-08-12

Three things:

1. `item_requests` — the list that answers "what do we need to buy?".
   Anyone raises one; the Inventory Manager moves it through
   REQUESTED → APPROVED → ORDERED → RECEIVED (or REJECTED); Finance reads
   the same list to plan payments.

2. `assets.vendor_id` — where an item was bought. Optional on purpose.

3. Grants. The stock.* keys were added to the catalog *after* the
   eight-roles migration ran, so NO role holds them — only legacy-ADMIN
   users can see locations, customers or vendors today. This grants
   stock.read to every role that works with items, stock.manage to the
   Inventory Manager, and the three new stock.requests.* keys:

     read    every role below (the boss asks anyone)
     create  every role below (anyone may ask)
     manage  Inventory Manager, Developer, Admin
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

revision = "a0b1c2d3e4f5"
down_revision = "e8f9a0b1c2d3"
branch_labels = None
depends_on = None


GRANTS = {
    "stock.read": [
        "Developer", "Admin", "Boss", "Inventory Manager",
        "Engineer", "Rigger", "Finance Manager", "R&D",
    ],
    "stock.manage": ["Developer", "Admin", "Inventory Manager"],
    "stock.requests.read": [
        "Developer", "Admin", "Boss", "Inventory Manager",
        "Engineer", "Rigger", "Finance Manager", "R&D",
    ],
    "stock.requests.create": [
        "Developer", "Admin", "Boss", "Inventory Manager",
        "Engineer", "Rigger", "Finance Manager", "R&D",
    ],
    "stock.requests.manage": ["Developer", "Admin", "Inventory Manager"],
}


def upgrade() -> None:
    op.create_table(
        "item_requests",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("needed_by", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="REQUESTED"),
        sa.Column("requested_by", PG_UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vendor_id", PG_UUID(as_uuid=True),
                  sa.ForeignKey("vendors.id"), nullable=True),
        sa.Column("estimated_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("status_note", sa.Text(), nullable=True),
        sa.Column("resolved_by", PG_UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_item_requests_status", "item_requests", ["status"])

    op.add_column(
        "assets",
        sa.Column("vendor_id", PG_UUID(as_uuid=True),
                  sa.ForeignKey("vendors.id"), nullable=True),
    )

    conn = op.get_bind()
    for key, roles in GRANTS.items():
        for role in roles:
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions (id, role_id, permission_key, created_at) "
                    "SELECT gen_random_uuid(), r.id, :k, now() FROM roles r "
                    "WHERE r.name = :n "
                    "AND NOT EXISTS (SELECT 1 FROM role_permissions rp "
                    "                WHERE rp.role_id = r.id AND rp.permission_key = :k)"
                ),
                {"k": key, "n": role},
            )


def downgrade() -> None:
    op.drop_column("assets", "vendor_id")
    op.drop_index("ix_item_requests_status", table_name="item_requests")
    op.drop_table("item_requests")
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "DELETE FROM role_permissions WHERE permission_key LIKE 'stock.requests.%'"
        )
    )
