"""roles, role_permissions, user_roles, user_permission_overrides, user_sessions

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-08-11

Replaces the section x level model with per-capability permission keys.

`user_permissions` (the old section/level/scope table) is deliberately LEFT IN
PLACE and not dropped: it holds 0 rows, dropping it would make this migration
irreversible in practice, and `assert_full_coverage()` guarantees nothing reads
it for authorization any more. It can be dropped once this has run in anger.

Seeds five system roles from the catalog so that flipping enforcement on does
not lock anybody out — the grants exist before the guards do.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b9c0d1e2f3a4"
down_revision = "a8b9c0d1e2f3"
branch_labels = None
depends_on = None


def _base_cols():
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "roles",
        *_base_cols(),
        sa.Column("name", sa.String(length=80), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "role_permissions",
        *_base_cols(),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("permission_key", sa.String(length=80), nullable=False),
        sa.UniqueConstraint("role_id", "permission_key", name="uq_role_permission"),
    )
    op.create_index("ix_role_permissions_role_id", "role_permissions", ["role_id"])

    op.create_table(
        "user_roles",
        *_base_cols(),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("roles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])

    op.create_table(
        "user_permission_overrides",
        *_base_cols(),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("permission_key", sa.String(length=80), nullable=False),
        sa.Column("effect", sa.String(length=5), nullable=False, server_default="ALLOW"),
        sa.UniqueConstraint(
            "user_id", "permission_key", name="uq_user_permission_override"
        ),
    )
    op.create_index(
        "ix_user_permission_overrides_user_id", "user_permission_overrides", ["user_id"]
    )

    op.create_table(
        "user_sessions",
        *_base_cols(),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("jti", sa.String(length=64), nullable=False, unique=True),
        sa.Column(
            "auth_provider", sa.String(length=20), nullable=False, server_default="LOCAL"
        ),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=400), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("ix_user_sessions_jti", "user_sessions", ["jti"])

    _seed_roles()


def _seed_roles() -> None:
    """Seed the system roles from the catalog, and map existing users onto them.

    Grants must exist before guards do, or the first request after this
    migration is a 403 for everyone.
    """
    import sys

    sys.path.insert(0, "/app")
    from core.authz_catalog import ALL_PERMISSIONS

    conn = op.get_bind()
    keys = set(ALL_PERMISSIONS)

    def having(*prefixes: str, exclude_dangerous: bool = False) -> set[str]:
        out = {k for k in keys if any(k.startswith(p) for p in prefixes)}
        if exclude_dangerous:
            out = {k for k in out if not ALL_PERMISSIONS[k].dangerous}
        return out

    read_only = {k for k in keys if k.endswith(".read")}

    presets = {
        "Administrator": (
            "Full access to every feature, including user administration.",
            set(keys),
        ),
        "Viewer": (
            "Read-only across the platform. No edits, no administration.",
            read_only - having("users.", "settings.", "backup.", "seeding.", "audit."),
        ),
        "Field Technician": (
            "Day-to-day field work: devices, troubleshooting, projects, "
            "inventory, their own attendance and expenses.",
            having(
                "devices.", "couples.", "pairs.", "locations.", "troubleshooting.",
                "projects.", "assets.", "materials.", "documents.", "downloads.",
                "attendance.", "updates.", "comparison.", "search.", "dashboard.",
                "ai.", "status.",
                exclude_dangerous=True,
            ),
        ),
        "Finance": (
            "Everything in Finance, including settlement, plus read access to "
            "the projects and people the money relates to.",
            having("finance.")
            | {
                "dashboard.read", "projects.read", "personnel.read",
                "attendance.read", "attendance.board", "search.read",
                "reports.read", "documents.read", "updates.read",
            },
        ),
        "Leadership": (
            "Sees everything, changes nothing except replying to updates.",
            read_only
            | {
                "leadership.read", "updates.comment", "updates.create",
                "attendance.board", "attendance.compoff", "finance.summary",
            },
        ),
    }

    role_ids: dict[str, str] = {}
    for name, (description, perms) in presets.items():
        rid = conn.execute(
            sa.text(
                "INSERT INTO roles (id, name, description, is_system, created_at) "
                "VALUES (gen_random_uuid(), :n, :d, true, now()) RETURNING id"
            ),
            {"n": name, "d": description},
        ).scalar_one()
        role_ids[name] = rid
        for key in sorted(p for p in perms if p in keys):
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions "
                    "(id, role_id, permission_key, created_at) "
                    "VALUES (gen_random_uuid(), :r, :k, now())"
                ),
                {"r": rid, "k": key},
            )

    # Map the legacy role strings onto the new presets so existing logins keep
    # working the moment enforcement turns on.
    legacy = {
        "ADMIN": "Administrator",
        "TECHNICIAN": "Field Technician",
        "VIEWER": "Viewer",
    }
    for legacy_role, preset in legacy.items():
        conn.execute(
            sa.text(
                "INSERT INTO user_roles (id, user_id, role_id, created_at) "
                "SELECT gen_random_uuid(), u.id, :r, now() FROM users u "
                "WHERE u.role = :lr AND u.deleted_at IS NULL"
            ),
            {"r": role_ids[preset], "lr": legacy_role},
        )


def downgrade() -> None:
    op.drop_index("ix_user_sessions_jti", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index(
        "ix_user_permission_overrides_user_id", table_name="user_permission_overrides"
    )
    op.drop_table("user_permission_overrides")
    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_table("role_permissions")
    op.drop_table("roles")
