"""Device models — which product a unit is

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-08-12

OpticSpectra comes in 1G and 10G; RF units and gyros have their own model
names. `device_models` is data the team extends from the device form itself
(no seeding); `devices.model_id` points at it. Also the era of gyro
auto-alignment: GYRO and GYRO_CTRL become valid device types — a code-level
list, no schema change needed (`device_type` is already a free string).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

revision = "d3e4f5a6b7c8"
down_revision = "c2d3e4f5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_models",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("device_type", sa.String(10), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "devices",
        sa.Column("model_id", PG_UUID(as_uuid=True),
                  sa.ForeignKey("device_models.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("devices", "model_id")
    op.drop_table("device_models")
