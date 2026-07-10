"""phase0: user_permissions table + auth provider/status columns

Revision ID: f0a1b2c3d4e5
Revises: d419f6942c2f
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0a1b2c3d4e5'
down_revision: Union[str, None] = 'd419f6942c2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_permissions',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('section', sa.String(length=50), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'section', name='uq_user_permissions_user_section'),
    )
    op.create_index(op.f('ix_user_permissions_user_id'), 'user_permissions', ['user_id'], unique=False)

    op.add_column('users', sa.Column('auth_provider', sa.String(length=20), server_default='LOCAL', nullable=False))
    op.add_column('users', sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False))
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=True)


def downgrade() -> None:
    op.alter_column('users', 'hashed_password', existing_type=sa.String(length=255), nullable=False)
    op.drop_column('users', 'status')
    op.drop_column('users', 'auth_provider')
    op.drop_index(op.f('ix_user_permissions_user_id'), table_name='user_permissions')
    op.drop_table('user_permissions')
