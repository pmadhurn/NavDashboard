"""phase2: projects, members, timeline, equipment movements

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
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
        'projects',
        sa.Column('name', sa.String(length=300), nullable=False),
        sa.Column('project_type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('customer_name', sa.String(length=300), nullable=True),
        sa.Column('site_location', sa.String(length=500), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_base_columns(),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False)

    op.create_table(
        'project_members',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('person_id', sa.UUID(), nullable=False),
        sa.Column('role_in_project', sa.String(length=100), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['person_id'], ['personnel.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_members_project_id'), 'project_members', ['project_id'], unique=False)

    op.create_table(
        'project_timeline_entries',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('entry_type', sa.String(length=30), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('entry_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_timeline_entries_project_id'), 'project_timeline_entries', ['project_id'], unique=False)

    op.create_table(
        'equipment_movements',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('direction', sa.String(length=10), nullable=False),
        sa.Column('movement_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('handled_by', sa.UUID(), nullable=True),
        sa.Column('received_by_name', sa.String(length=300), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['handled_by'], ['personnel.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_equipment_movements_project_id'), 'equipment_movements', ['project_id'], unique=False)

    op.create_table(
        'equipment_movement_items',
        sa.Column('movement_id', sa.UUID(), nullable=False),
        sa.Column('asset_id', sa.UUID(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('condition_note', sa.Text(), nullable=True),
        sa.Column('item_status', sa.String(length=20), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['movement_id'], ['equipment_movements.id']),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_equipment_movement_items_movement_id'), 'equipment_movement_items', ['movement_id'], unique=False)
    op.create_index(op.f('ix_equipment_movement_items_asset_id'), 'equipment_movement_items', ['asset_id'], unique=False)


def downgrade() -> None:
    op.drop_table('equipment_movement_items')
    op.drop_table('equipment_movements')
    op.drop_table('project_timeline_entries')
    op.drop_table('project_members')
    op.drop_table('projects')
