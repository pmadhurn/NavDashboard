"""phase E: fund advances, expense claims, expense settlement fields

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
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
        'fund_allocations',
        sa.Column('person_id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('received_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('source_note', sa.Text(), nullable=True),
        sa.Column('logged_by', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['person_id'], ['personnel.id']),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_fund_allocations_person_id'), 'fund_allocations', ['person_id'], unique=False)
    op.create_index(op.f('ix_fund_allocations_project_id'), 'fund_allocations', ['project_id'], unique=False)

    op.create_table(
        'expense_claims',
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=True),
        sa.Column('submitted_by', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('settled_by', sa.UUID(), nullable=True),
        sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
        *_base_columns(),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_expense_claims_project_id'), 'expense_claims', ['project_id'], unique=False)

    op.add_column('expenses', sa.Column('claim_id', sa.UUID(), nullable=True))
    op.add_column('expenses', sa.Column('status', sa.String(length=20), server_default='SUBMITTED', nullable=False))
    op.add_column('expenses', sa.Column('paid_by', sa.UUID(), nullable=True))
    op.add_column('expenses', sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_expenses_claim_id'), 'expenses', ['claim_id'], unique=False)
    op.create_foreign_key('fk_expenses_claim_id', 'expenses', 'expense_claims', ['claim_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_expenses_claim_id', 'expenses', type_='foreignkey')
    op.drop_index(op.f('ix_expenses_claim_id'), table_name='expenses')
    op.drop_column('expenses', 'paid_at')
    op.drop_column('expenses', 'paid_by')
    op.drop_column('expenses', 'status')
    op.drop_column('expenses', 'claim_id')
    op.drop_index(op.f('ix_expense_claims_project_id'), table_name='expense_claims')
    op.drop_table('expense_claims')
    op.drop_index(op.f('ix_fund_allocations_project_id'), table_name='fund_allocations')
    op.drop_index(op.f('ix_fund_allocations_person_id'), table_name='fund_allocations')
    op.drop_table('fund_allocations')
