"""phase3: office-wide asset inventory tables

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _base_columns():
    return [
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        'asset_categories',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('parent_id', sa.UUID(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['parent_id'], ['asset_categories.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'assets',
        sa.Column('asset_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=300), nullable=False),
        sa.Column('category_id', sa.UUID(), nullable=True),
        sa.Column('item_kind', sa.String(length=20), nullable=False),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('current_project_id', sa.UUID(), nullable=True),
        sa.Column('current_person_id', sa.UUID(), nullable=True),
        sa.Column('device_id', sa.UUID(), nullable=True),
        sa.Column('purchase_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('purchase_price', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tag_identifiers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['category_id'], ['asset_categories.id']),
        sa.ForeignKeyConstraint(['current_person_id'], ['personnel.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_assets_asset_code'), 'assets', ['asset_code'], unique=True)
    op.create_index(op.f('ix_assets_serial_number'), 'assets', ['serial_number'], unique=False)
    op.create_index(op.f('ix_assets_status'), 'assets', ['status'], unique=False)

    op.create_table(
        'asset_history',
        sa.Column('asset_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('old_status', sa.String(length=20), nullable=True),
        sa.Column('new_status', sa.String(length=20), nullable=True),
        sa.Column('project_id', sa.UUID(), nullable=True),
        sa.Column('person_id', sa.UUID(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('performed_by', sa.UUID(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_asset_history_asset_id'), 'asset_history', ['asset_id'], unique=False)

    op.create_table(
        'asset_reports',
        sa.Column('report_type', sa.String(length=20), nullable=False),
        sa.Column('asset_id', sa.UUID(), nullable=True),
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('reported_by', sa.UUID(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('asset_reports')
    op.drop_index(op.f('ix_asset_history_asset_id'), table_name='asset_history')
    op.drop_table('asset_history')
    op.drop_index(op.f('ix_assets_status'), table_name='assets')
    op.drop_index(op.f('ix_assets_serial_number'), table_name='assets')
    op.drop_index(op.f('ix_assets_asset_code'), table_name='assets')
    op.drop_table('assets')
    op.drop_table('asset_categories')
