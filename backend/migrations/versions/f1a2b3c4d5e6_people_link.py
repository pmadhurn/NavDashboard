"""phase B: link personnel to users (one identity)

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('personnel', sa.Column('user_id', sa.UUID(), nullable=True))
    op.create_unique_constraint('uq_personnel_user_id', 'personnel', ['user_id'])
    op.create_foreign_key(
        'fk_personnel_user_id', 'personnel', 'users', ['user_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_personnel_user_id', 'personnel', type_='foreignkey')
    op.drop_constraint('uq_personnel_user_id', 'personnel', type_='unique')
    op.drop_column('personnel', 'user_id')
