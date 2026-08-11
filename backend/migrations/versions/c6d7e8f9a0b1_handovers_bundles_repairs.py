"""Handovers, bundles and repairs

Revision ID: c6d7e8f9a0b1
Revises: b5c6d7e8f9a0
Create Date: 2026-08-11
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "c6d7e8f9a0b1"
down_revision = "b5c6d7e8f9a0"
branch_labels = None
depends_on = None


def _base():
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "asset_handovers", *_base(),
        sa.Column("from_person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("personnel.id"), nullable=False),
        sa.Column("to_person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("personnel.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("response_note", sa.Text(), nullable=True),
        sa.Column("initiated_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("responded_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_asset_handovers_from", "asset_handovers", ["from_person_id"])
    op.create_index("ix_asset_handovers_to", "asset_handovers", ["to_person_id"])
    op.create_index("ix_asset_handovers_status", "asset_handovers", ["status"])

    op.create_table(
        "asset_handover_items", *_base(),
        sa.Column("handover_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("asset_handovers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_asset_handover_items_handover", "asset_handover_items", ["handover_id"])
    op.create_index("ix_asset_handover_items_asset", "asset_handover_items", ["asset_id"])

    op.create_table(
        "asset_bundles", *_base(),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_table(
        "asset_bundle_items", *_base(),
        sa.Column("bundle_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("asset_bundles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_asset_bundle_items_bundle", "asset_bundle_items", ["bundle_id"])
    op.create_index("ix_asset_bundle_items_asset", "asset_bundle_items", ["asset_id"])

    op.create_table(
        "asset_repairs", *_base(),
        sa.Column("asset_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="REPORTED"),
        sa.Column("damage_details", sa.Text(), nullable=False),
        sa.Column("damaged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("damage_location", sa.String(length=300), nullable=True),
        sa.Column("responsible_person_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("personnel.id"), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("is_repairable", sa.Boolean(), nullable=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vendors.id"), nullable=True),
        sa.Column("cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outcome_note", sa.Text(), nullable=True),
        sa.Column("reported_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_asset_repairs_asset", "asset_repairs", ["asset_id"])
    op.create_index("ix_asset_repairs_status", "asset_repairs", ["status"])

    # Per-item outcome on the existing outward/inward line items. The old
    # item_status could not say "left at the customer's site", so a mismatch
    # between what went out and what came back read as items simply missing.
    op.add_column(
        "equipment_movement_items",
        sa.Column("return_outcome", sa.String(length=25), nullable=True),
    )
    op.add_column(
        "equipment_movement_items",
        sa.Column("outcome_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "equipment_movement_items",
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    for col in ("resolved_at", "outcome_note", "return_outcome"):
        op.drop_column("equipment_movement_items", col)
    op.drop_table("asset_repairs")
    op.drop_table("asset_bundle_items")
    op.drop_table("asset_bundles")
    op.drop_table("asset_handover_items")
    op.drop_table("asset_handovers")
