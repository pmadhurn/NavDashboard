"""phase5: link error_logs to projects and assets

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('error_logs', sa.Column('project_id', sa.UUID(), nullable=True))
    op.add_column('error_logs', sa.Column('asset_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_error_logs_project_id'), 'error_logs', ['project_id'], unique=False)
    op.create_index(op.f('ix_error_logs_asset_id'), 'error_logs', ['asset_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_error_logs_asset_id'), table_name='error_logs')
    op.drop_index(op.f('ix_error_logs_project_id'), table_name='error_logs')
    op.drop_column('error_logs', 'asset_id')
    op.drop_column('error_logs', 'project_id')
