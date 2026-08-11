"""Drop seed_records and the legacy user_permissions table

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-08-11

Two tables whose systems no longer exist.

`seed_records` registered which rows were demo data. With seeding deleted there
is nothing to register, and leaving it is worse than useless: it had every one
of the database's rows registered, so anything that read it and offered to
"remove demo data" would have emptied the application.

`user_permissions` was the section x level model, superseded by per-capability
keys. It has never held a row.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e2f3a4b5c6d7"
down_revision = "d1e2f3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS seed_records CASCADE")
    op.execute("DROP TABLE IF EXISTS user_permissions CASCADE")


def downgrade() -> None:
    # Recreated empty. The rows are gone either way, and inventing provenance
    # for existing data would be worse than having none.
    op.create_table(
        "user_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("section", sa.String(length=50), nullable=False),
        sa.Column("level", sa.String(length=20), nullable=False),
        sa.Column("scope", sa.String(length=10), nullable=False, server_default="ALL"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "section", name="uq_user_permissions_user_section"),
    )
