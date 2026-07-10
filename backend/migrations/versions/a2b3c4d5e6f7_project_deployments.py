"""phase C: project_deployments + unique device_id on assets

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_deployments',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('entity_type', sa.String(length=20), nullable=False),
        sa.Column('entity_id', sa.UUID(), nullable=False),
        sa.Column('deployed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('removed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_deployments_project_id'), 'project_deployments', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_deployments_entity_id'), 'project_deployments', ['entity_id'], unique=False)

    # One mirror asset per device
    op.create_index(
        'uq_assets_device_id',
        'assets',
        ['device_id'],
        unique=True,
        postgresql_where=sa.text('device_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('uq_assets_device_id', table_name='assets')
    op.drop_index(op.f('ix_project_deployments_entity_id'), table_name='project_deployments')
    op.drop_index(op.f('ix_project_deployments_project_id'), table_name='project_deployments')
    op.drop_table('project_deployments')
