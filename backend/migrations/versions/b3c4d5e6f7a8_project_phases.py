"""phase D: project phases + phase_id on movements/members

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3c4d5e6f7a8'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'project_phases',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('phase_type', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lead_person_id', sa.UUID(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['lead_person_id'], ['personnel.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_project_phases_project_id'), 'project_phases', ['project_id'], unique=False)

    op.add_column('equipment_movements', sa.Column('phase_id', sa.UUID(), nullable=True))
    op.add_column('project_members', sa.Column('phase_id', sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column('project_members', 'phase_id')
    op.drop_column('equipment_movements', 'phase_id')
    op.drop_index(op.f('ix_project_phases_project_id'), table_name='project_phases')
    op.drop_table('project_phases')
