"""seed_records: provenance for demo data

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-09

Adds the registry that makes "remove seeded data" safe. Without it there is
no way to tell a seeded row from a real one, so removal could only ever have
been a blanket delete.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d5e6f7a8b9c0"
down_revision = "c4d5e6f7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seed_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "seeded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "origin", sa.String(length=20), server_default="seeder", nullable=False
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
    op.create_index("ix_seed_records_entity_type", "seed_records", ["entity_type"])
    op.create_index("ix_seed_records_entity_id", "seed_records", ["entity_id"])
    op.create_index("ix_seed_records_batch_id", "seed_records", ["batch_id"])
    # One provenance row per entity — makes adopt/seed idempotent.
    op.create_index(
        "ix_seed_records_type_entity",
        "seed_records",
        ["entity_type", "entity_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_seed_records_type_entity", table_name="seed_records")
    op.drop_index("ix_seed_records_batch_id", table_name="seed_records")
    op.drop_index("ix_seed_records_entity_id", table_name="seed_records")
    op.drop_index("ix_seed_records_entity_type", table_name="seed_records")
    op.drop_table("seed_records")
