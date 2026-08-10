"""daily_updates + update_comments

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-08-11

`posted_for` is the day being reported on and is separate from `created_at`:
writing up Friday's site work on Monday morning should file it under Friday.

Comments cascade on delete at the database level as well as through the soft
delete, so a hard delete of an update can never orphan its thread.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a8b9c0d1e2f3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_updates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("personnel.id"),
            nullable=True,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("posted_for", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_daily_updates_author_id", "daily_updates", ["author_id"])
    op.create_index("ix_daily_updates_person_id", "daily_updates", ["person_id"])
    op.create_index("ix_daily_updates_project_id", "daily_updates", ["project_id"])
    op.create_index("ix_daily_updates_posted_for", "daily_updates", ["posted_for"])

    op.create_table(
        "update_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "update_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("daily_updates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_update_comments_update_id", "update_comments", ["update_id"])


def downgrade() -> None:
    op.drop_index("ix_update_comments_update_id", table_name="update_comments")
    op.drop_table("update_comments")
    op.drop_index("ix_daily_updates_posted_for", table_name="daily_updates")
    op.drop_index("ix_daily_updates_project_id", table_name="daily_updates")
    op.drop_index("ix_daily_updates_person_id", table_name="daily_updates")
    op.drop_index("ix_daily_updates_author_id", table_name="daily_updates")
    op.drop_table("daily_updates")
