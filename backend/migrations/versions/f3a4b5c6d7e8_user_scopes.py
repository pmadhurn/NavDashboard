"""user_scopes — restore assignable row-ownership scope

Revision ID: f3a4b5c6d7e8
Revises: e2f3a4b5c6d7
Create Date: 2026-08-11

Dropping `user_permissions` took the per-user `scope` column with it, which
meant TEAM scope could no longer be given to anyone — a team lead had no way to
be granted approval over their own team and nobody else's. The permission keys
replaced the *level* dimension; they never carried the *whose* dimension.

Small, separate table rather than a column on user_permission_overrides: scope
is per section, permissions are per capability, and repeating a lead's TEAM
scope across every attendance key would be several places to get it wrong.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f3a4b5c6d7e8"
down_revision = "e2f3a4b5c6d7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_scopes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section", sa.String(length=50), nullable=False),
        sa.Column("scope", sa.String(length=10), nullable=False, server_default="ALL"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "section", name="uq_user_scope"),
    )
    op.create_index("ix_user_scopes_user_id", "user_scopes", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_scopes_user_id", table_name="user_scopes")
    op.drop_table("user_scopes")
