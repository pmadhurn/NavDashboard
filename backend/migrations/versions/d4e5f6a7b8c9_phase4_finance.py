"""phase4: finance — expenses, members, batches

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
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
        'expense_batches',
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'expenses',
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('expense_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('project_id', sa.UUID(), nullable=True),
        sa.Column('batch_id', sa.UUID(), nullable=True),
        sa.Column('added_by', sa.UUID(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('custom_fields', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.ForeignKeyConstraint(['batch_id'], ['expense_batches.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_expenses_project_id'), 'expenses', ['project_id'], unique=False)

    op.create_table(
        'expense_members',
        sa.Column('expense_id', sa.UUID(), nullable=False),
        sa.Column('person_id', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['expense_id'], ['expenses.id']),
        sa.ForeignKeyConstraint(['person_id'], ['personnel.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_expense_members_expense_id'), 'expense_members', ['expense_id'], unique=False)


def downgrade() -> None:
    op.drop_table('expense_members')
    op.drop_index(op.f('ix_expenses_project_id'), table_name='expenses')
    op.drop_table('expenses')
    op.drop_table('expense_batches')
