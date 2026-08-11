"""Merge the old "Administrator" role into "Admin"

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-08-11

The eight-role migration renamed Field Technician/Leadership/Finance in place
but not "Administrator", so it created a fresh "Admin" alongside it and left the
two real users holding the old one. Two roles meaning the same thing is exactly
the confusion roles exist to prevent.

Holders are moved before the old role is deleted — a delete-then-reassign would
strand them with no role at all, and the ON DELETE CASCADE on user_roles means
that loss would be silent.
"""
from alembic import op
import sqlalchemy as sa

revision = "d1e2f3a4b5c6"
down_revision = "c0d1e2f3a4b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    old_id = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'Administrator'")
    ).scalar_one_or_none()
    new_id = conn.execute(
        sa.text("SELECT id FROM roles WHERE name = 'Admin'")
    ).scalar_one_or_none()

    if old_id is None:
        return
    if new_id is None:
        # Nothing to merge into: just rename, keeping every assignment.
        conn.execute(
            sa.text("UPDATE roles SET name = 'Admin' WHERE id = :r"), {"r": old_id}
        )
        return

    # Move holders first, skipping anyone who already holds Admin.
    conn.execute(
        sa.text(
            "INSERT INTO user_roles (id, user_id, role_id, created_at) "
            "SELECT gen_random_uuid(), ur.user_id, :new, now() FROM user_roles ur "
            "WHERE ur.role_id = :old "
            "AND NOT EXISTS (SELECT 1 FROM user_roles x "
            "                WHERE x.user_id = ur.user_id AND x.role_id = :new)"
        ),
        {"old": old_id, "new": new_id},
    )
    conn.execute(sa.text("DELETE FROM user_roles WHERE role_id = :old"), {"old": old_id})
    conn.execute(sa.text("DELETE FROM role_permissions WHERE role_id = :old"), {"old": old_id})
    conn.execute(sa.text("DELETE FROM roles WHERE id = :old"), {"old": old_id})


def downgrade() -> None:
    pass
