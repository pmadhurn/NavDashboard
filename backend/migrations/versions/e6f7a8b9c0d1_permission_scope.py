"""permission scope + team lead

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-11

Adds the "whose records" dimension the section x level model was missing.

`user_permissions.scope` defaults to 'ALL' so that every existing grant, and
every one of the 79 checks already enforcing this model, keeps exactly the
meaning it had before this migration ran. Narrowing is opt-in.

`personnel.team_lead_id` defines what scope='TEAM' means. Project membership
cannot answer it: someone between projects would belong to no team, and so no
lead could approve their attendance.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e6f7a8b9c0d1"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_permissions",
        sa.Column(
            "scope", sa.String(length=10), server_default="ALL", nullable=False
        ),
    )
    op.add_column(
        "personnel",
        sa.Column("team_lead_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_personnel_team_lead",
        "personnel",
        "personnel",
        ["team_lead_id"],
        ["id"],
    )
    op.create_index("ix_personnel_team_lead_id", "personnel", ["team_lead_id"])


def downgrade() -> None:
    op.drop_index("ix_personnel_team_lead_id", table_name="personnel")
    op.drop_constraint("fk_personnel_team_lead", "personnel", type_="foreignkey")
    op.drop_column("personnel", "team_lead_id")
    op.drop_column("user_permissions", "scope")
