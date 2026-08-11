"""Replace the five starter roles with the eight real ones

Revision ID: c0d1e2f3a4b5
Revises: b9c0d1e2f3a4
Create Date: 2026-08-11

The five seeded roles were placeholders. These eight are the actual people in
Nav Wireless: Developer, Admin, Boss, Inventory Manager, Engineer, Rigger,
Finance Manager, R&D.

Roles are DATA. These are starting points the Admin can edit; nothing in the
code depends on a particular role existing or on what it contains.

Existing roles keep their identity where the name matches, so anyone already
assigned stays assigned. "Field Technician" is renamed to "Engineer" in place
rather than dropped and recreated, which would silently unassign its holders.
"""
from alembic import op
import sqlalchemy as sa

revision = "c0d1e2f3a4b5"
down_revision = "b9c0d1e2f3a4"
branch_labels = None
depends_on = None


def _presets():
    import sys

    sys.path.insert(0, "/app")
    from core.authz_catalog import ALL_PERMISSIONS

    keys = set(ALL_PERMISSIONS)

    def having(*prefixes: str, safe_only: bool = False) -> set[str]:
        out = {k for k in keys if any(k.startswith(p) for p in prefixes)}
        if safe_only:
            out = {k for k in out if not ALL_PERMISSIONS[k].dangerous}
        return out

    read_only = {k for k in keys if k.endswith(".read")}
    platform = having("users.", "settings.", "backup.", "audit.")

    # What a field person touches every day. Deliberately excludes destructive
    # keys: losing a device record is not part of anyone's day.
    field = having(
        "devices.", "couples.", "pairs.", "locations.", "troubleshooting.",
        "projects.", "assets.", "materials.", "documents.", "downloads.",
        "attendance.", "updates.", "comparison.", "search.", "dashboard.",
        "ai.", "status.", "reports.",
        safe_only=True,
    )

    inventory = (
        having("assets.", "materials.", "downloads.")
        | {
            "dashboard.read", "projects.read", "personnel.read", "devices.read",
            "couples.read", "pairs.read", "locations.read", "search.read",
            "documents.read", "documents.create", "reports.read",
            "updates.read", "updates.create", "updates.comment",
            "attendance.read", "attendance.board",
            "status.read", "status.change", "ai.read", "ai.create",
        }
    )

    finance = (
        having("finance.")
        | {
            "dashboard.read", "projects.read", "personnel.read", "search.read",
            "reports.read", "documents.read", "updates.read", "updates.comment",
            "attendance.read", "attendance.board", "attendance.compoff",
            "ai.read", "ai.create",
        }
    )

    rnd = (
        having("troubleshooting.", "devices.", "couples.", "pairs.", "locations.",
               safe_only=True)
        | {
            "dashboard.read", "comparison.read", "reports.read",
            "reports.generate", "search.read", "assets.read", "assets.update",
            "assets.reports", "materials.read", "materials.update",
            "documents.read", "documents.create", "projects.read",
            "updates.read", "updates.create", "updates.comment",
            "attendance.read", "status.read", "status.change",
            "ai.read", "ai.create",
        }
    )

    boss = read_only | {
        "leadership.read", "updates.create", "updates.comment",
        "attendance.board", "attendance.compoff", "finance.summary",
        "reports.generate",
    }
    boss -= having("backup.", "seeding.")

    return {
        "Developer": (
            "Builds and diagnoses the platform. System health, migrations, "
            "backups and every technical surface.",
            set(keys),
        ),
        "Admin": (
            "Runs the company's use of the platform: users, access, settings "
            "and approvals. Not a developer account.",
            (set(keys) - having("seeding.")) ,
        ),
        "Boss": (
            "Sees everything across projects, money, people and equipment. "
            "Changes almost nothing.",
            boss,
        ),
        "Inventory Manager": (
            "Custody of every physical item: stock, movements, repairs, "
            "handovers and what is out at sites.",
            inventory,
        ),
        "Engineer": (
            "Site team. Devices, troubleshooting, projects, equipment, and "
            "their own attendance, updates and expenses.",
            field | {"finance.read", "finance.create", "exports.read"} & keys,
        ),
        "Rigger": (
            "Site team, lighter surface. Equipment, attendance, updates and "
            "expenses.",
            (having("attendance.", "updates.", safe_only=True)
             | {
                 "dashboard.read", "assets.read", "projects.read",
                 "documents.read", "documents.create", "downloads.read",
                 "search.read", "finance.read", "finance.create",
                 "devices.read", "ai.read", "ai.create",
             }),
        ),
        "Finance Manager": (
            "Expenses, advances, claims and settlement, plus read access to "
            "the projects and people the money relates to.",
            finance,
        ),
        "R&D": (
            "Troubleshooting and device health: diagnosis, error logs, device "
            "history, comparison and reports.",
            rnd,
        ),
    }


def upgrade() -> None:
    conn = op.get_bind()
    presets = _presets()

    # Rename in place where a preset supersedes an existing role, so nobody
    # already assigned is silently unassigned by a drop-and-recreate.
    renames = {"Field Technician": "Engineer", "Leadership": "Boss", "Finance": "Finance Manager"}
    for old, new in renames.items():
        conn.execute(
            sa.text(
                "UPDATE roles SET name = :new WHERE name = :old "
                "AND NOT EXISTS (SELECT 1 FROM roles r2 WHERE r2.name = :new)"
            ),
            {"old": old, "new": new},
        )

    for name, (description, perms) in presets.items():
        rid = conn.execute(
            sa.text("SELECT id FROM roles WHERE name = :n"), {"n": name}
        ).scalar_one_or_none()
        if rid is None:
            rid = conn.execute(
                sa.text(
                    "INSERT INTO roles (id, name, description, is_system, created_at) "
                    "VALUES (gen_random_uuid(), :n, :d, true, now()) RETURNING id"
                ),
                {"n": name, "d": description},
            ).scalar_one()
        else:
            conn.execute(
                sa.text(
                    "UPDATE roles SET description = :d, is_system = true, "
                    "deleted_at = NULL WHERE id = :r"
                ),
                {"d": description, "r": rid},
            )
            conn.execute(
                sa.text("DELETE FROM role_permissions WHERE role_id = :r"), {"r": rid}
            )

        for key in sorted(perms):
            conn.execute(
                sa.text(
                    "INSERT INTO role_permissions "
                    "(id, role_id, permission_key, created_at) "
                    "VALUES (gen_random_uuid(), :r, :k, now()) "
                    "ON CONFLICT DO NOTHING"
                ),
                {"r": rid, "k": key},
            )

    # "Viewer" was a placeholder with no real-world counterpart. Removed only if
    # nobody holds it — an unused role is clutter, a used one is somebody's access.
    conn.execute(
        sa.text(
            "DELETE FROM roles WHERE name = 'Viewer' "
            "AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.role_id = roles.id)"
        )
    )


def downgrade() -> None:
    # Roles are data; there is no meaningful automatic reversal. Restoring the
    # five placeholders would be inventing history.
    pass
