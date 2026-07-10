"""phase1: downloads section tables

Revision ID: a1b2c3d4e5f6
Revises: f0a1b2c3d4e5
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f0a1b2c3d4e5'
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
        'download_categories',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False),
        *_base_columns(),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    op.create_table(
        'download_items',
        sa.Column('title', sa.String(length=300), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category_id', sa.UUID(), nullable=True),
        sa.Column('item_type', sa.String(length=20), nullable=False),
        sa.Column('visibility', sa.String(length=20), nullable=False),
        sa.Column('tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('uploaded_by', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['category_id'], ['download_categories.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'download_versions',
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('version_label', sa.String(length=100), nullable=True),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('storage_path', sa.String(length=1000), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('mime_type', sa.String(length=200), nullable=True),
        sa.Column('release_notes', sa.Text(), nullable=True),
        sa.Column('uploaded_by', sa.UUID(), nullable=False),
        sa.Column('download_count', sa.Integer(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['item_id'], ['download_items.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_download_versions_item_id'), 'download_versions', ['item_id'], unique=False)

    op.create_table(
        'download_item_access',
        sa.Column('item_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        *_base_columns(),
        sa.ForeignKeyConstraint(['item_id'], ['download_items.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_id', 'user_id', name='uq_download_access_item_user'),
    )
    op.create_index(op.f('ix_download_item_access_item_id'), 'download_item_access', ['item_id'], unique=False)
    op.create_index(op.f('ix_download_item_access_user_id'), 'download_item_access', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('download_item_access')
    op.drop_index(op.f('ix_download_versions_item_id'), table_name='download_versions')
    op.drop_table('download_versions')
    op.drop_table('download_items')
    op.drop_table('download_categories')
