"""The permission catalog and the endpoint -> permission map.

Two ideas hold this together:

1. **Every operation has a permission key.** `ENDPOINT_PERMISSIONS` maps each
   endpoint function (by `module.name`, which is unique across all 239
   operations) to exactly one key, or to one of the two sentinels below. The
   app refuses to start if a registered route is missing from this file, so an
   unguarded endpoint is impossible rather than merely unlikely.

2. **Keys are `<group>.<action>`,** fine-grained enough that an admin can grant
   "see the device list" without granting "delete a device", and coarse enough
   that the permission screen is a readable list rather than 239 checkboxes.

Why a central map rather than a decorator next to each endpoint: 239 operations
across 27 router files, and the property that matters — *no operation escapes* —
is a statement about the whole set, which is checkable here and nowhere else.
The startup assertion is what makes this safe; without it a central map would
drift exactly the way the old `require_role` sprawl did.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Sentinels. Anything else is a permission key that must exist in PERMISSIONS.
PUBLIC = "__public__"          # no authentication at all (login, health)
AUTHENTICATED = "__auth__"     # any signed-in user; self-service only


@dataclass(frozen=True)
class PermissionDef:
    key: str
    label: str
    group: str
    description: str = ""
    # Destructive or trust-granting operations. The admin UI renders these
    # apart so that "grant everything in this group" cannot quietly include
    # "restore the database over the top of production".
    dangerous: bool = False


@dataclass
class PermissionGroup:
    key: str
    label: str
    description: str = ""
    permissions: list[PermissionDef] = field(default_factory=list)


def _crud(
    group: str,
    label: str,
    *,
    read: str | None = "View",
    create: str | None = "Create",
    update: str | None = "Edit",
    delete: str | None = "Delete",
) -> list[PermissionDef]:
    out = []
    for action, verb in (("read", read), ("create", create), ("update", update), ("delete", delete)):
        if verb is None:
            continue
        out.append(
            PermissionDef(
                key=f"{group}.{action}",
                label=f"{verb} {label.lower()}",
                group=group,
                dangerous=(action == "delete"),
            )
        )
    return out


# --- the catalog -----------------------------------------------------------
# Order here is the order the admin screen renders in: everyday modules first,
# platform administration last.

GROUPS: list[PermissionGroup] = [
    PermissionGroup("dashboard", "Dashboard", "The landing page and its widgets", [
        PermissionDef("dashboard.read", "View the dashboard", "dashboard"),
    ]),
    PermissionGroup("leadership", "Leadership", "The cross-module leadership overview", [
        PermissionDef("leadership.read", "View the leadership overview", "leadership"),
    ]),
    PermissionGroup("devices", "Devices", "Devices, couples, pairs and their status", [
        *_crud("devices", "devices"),
        PermissionDef("devices.status", "Change device status", "devices"),
    ]),
    PermissionGroup("couples", "Couples", "", [
        *_crud("couples", "couples"),
    ]),
    PermissionGroup("pairs", "Pairs", "", [
        *_crud("pairs", "pairs"),
    ]),
    PermissionGroup("locations", "Locations", "Sites and location history", _crud("locations", "locations")),
    PermissionGroup("troubleshooting", "Troubleshooting", "Error logs and resolution steps", [
        *_crud("troubleshooting", "error logs"),
        PermissionDef("troubleshooting.resolve", "Resolve an error", "troubleshooting"),
    ]),
    PermissionGroup("comparison", "Comparison", "", [
        PermissionDef("comparison.read", "Compare devices, couples and pairs", "comparison"),
    ]),
    PermissionGroup("search", "Search", "", [
        PermissionDef("search.read", "Search across the platform", "search"),
    ]),
    PermissionGroup("reports", "Reports", "", [
        PermissionDef("reports.read", "View report templates", "reports"),
        PermissionDef("reports.generate", "Generate a report", "reports"),
    ]),
    PermissionGroup("projects", "Projects", "Projects, phases, teams and equipment movements", [
        *_crud("projects", "projects"),
        PermissionDef("projects.members", "Manage project team members", "projects"),
        PermissionDef("projects.phases", "Start and end project phases", "projects"),
        PermissionDef("projects.equipment", "Record outward and inward equipment", "projects"),
        PermissionDef("projects.deployments", "Manage deployed items", "projects"),
        PermissionDef("projects.close", "Close a project", "projects", dangerous=True),
    ]),
    PermissionGroup("assets", "Inventory (assets)", "The master stock list", [
        *_crud("assets", "assets"),
        PermissionDef("assets.categories", "Manage asset categories", "assets"),
        PermissionDef("assets.backfill", "Backfill assets from devices", "assets", dangerous=True),
        PermissionDef("assets.reports", "Asset reports", "assets"),
        PermissionDef("assets.custody", "Move an item, or change who holds it", "assets"),
        PermissionDef("assets.condition", "Report damage, repair or loss", "assets"),
        PermissionDef("assets.handover", "Hand items to another person", "assets"),
        PermissionDef("assets.bundles", "Create and edit kits", "assets"),
        PermissionDef("assets.returns", "Record what came back from a site", "assets"),
        PermissionDef("assets.repairs", "Manage the repair workflow", "assets"),
    ]),
    PermissionGroup("tasks", "My work", "Your own task list and notifications", [
        PermissionDef("tasks.read", "See your tasks and notifications", "tasks"),
    ]),
    PermissionGroup("stock", "Stock places & parties",
                    "Where things are kept, and who we hand them to", [
        PermissionDef("stock.read", "View locations, customers and vendors", "stock"),
        PermissionDef("stock.manage", "Add and remove them", "stock", dangerous=True),
    ]),
    PermissionGroup("materials", "Fitting materials", "Per-couple consumables (backend 'inventory')", [
        *_crud("materials", "fitting materials"),
        PermissionDef("materials.templates", "Manage material templates", "materials"),
    ]),
    PermissionGroup("documents", "Documents", "Files attached to devices, couples and projects", [
        *_crud("documents", "documents"),
        PermissionDef("documents.share", "Create a public share link", "documents", dangerous=True),
    ]),
    PermissionGroup("downloads", "Downloads", "The software and materials archive", [
        *_crud("downloads", "downloads"),
        PermissionDef("downloads.categories", "Manage download categories", "downloads"),
        PermissionDef("downloads.access", "Grant access to a download", "downloads", dangerous=True),
    ]),
    PermissionGroup("finance", "Finance", "Expenses, advances, claims and settlement", [
        *_crud("finance", "expenses"),
        PermissionDef("finance.advances", "Record advances", "finance"),
        PermissionDef("finance.claims", "Submit and manage claims", "finance"),
        PermissionDef("finance.settle", "Settle and mark claims paid", "finance", dangerous=True),
        PermissionDef("finance.import", "Import expenses from a spreadsheet", "finance"),
        PermissionDef("finance.export", "Export finance data", "finance"),
        PermissionDef("finance.summary", "View organisation-wide finance totals", "finance"),
    ]),
    PermissionGroup("attendance", "Attendance", "Day types, the team board and comp-off", [
        *_crud("attendance", "attendance"),
        PermissionDef("attendance.board", "View the team attendance board", "attendance"),
        PermissionDef("attendance.compoff", "View comp-off balances", "attendance"),
        PermissionDef("attendance.adjust", "Adjust comp-off manually", "attendance", dangerous=True),
    ]),
    PermissionGroup("updates", "Daily updates", "The shared update timeline", [
        *_crud("updates", "updates"),
        PermissionDef("updates.comment", "Reply to an update", "updates"),
    ]),
    PermissionGroup("personnel", "Personnel", "Field staff records", [
        *_crud("personnel", "personnel"),
        PermissionDef("personnel.link", "Link a person to a login", "personnel", dangerous=True),
    ]),
    PermissionGroup("ai", "AI assistant", "", [
        PermissionDef("ai.read", "View chat sessions", "ai"),
        PermissionDef("ai.create", "Chat with the assistant", "ai"),
        PermissionDef("ai.delete", "Delete chat sessions", "ai", dangerous=True),
        PermissionDef("ai.manage", "Re-index and configure the assistant", "ai", dangerous=True),
    ]),
    PermissionGroup("users", "Users & access", "Accounts, approvals and permissions", [
        PermissionDef("users.read", "View users", "users"),
        PermissionDef("users.create", "Create users", "users"),
        PermissionDef("users.update", "Edit users", "users"),
        PermissionDef("users.delete", "Delete users", "users", dangerous=True),
        PermissionDef("users.approve", "Approve pending sign-ups", "users", dangerous=True),
        PermissionDef("users.permissions.read", "View a user's permissions", "users"),
        PermissionDef("users.permissions.manage", "Change a user's permissions", "users", dangerous=True),
        PermissionDef("users.sessions.read", "View active sessions", "users"),
        PermissionDef("users.sessions.revoke", "Sign a user out everywhere", "users", dangerous=True),
        PermissionDef("users.roles.manage", "Create and edit roles", "users", dangerous=True),
    ]),
    PermissionGroup("settings", "System settings", "", [
        PermissionDef("settings.read", "View system settings", "settings"),
        PermissionDef("settings.update", "Change system settings", "settings", dangerous=True),
    ]),
    PermissionGroup("audit", "Audit trail", "", [
        PermissionDef("audit.read", "View the audit trail", "audit"),
        PermissionDef("audit.revert", "Revert an audited change", "audit", dangerous=True),
    ]),
    PermissionGroup("backup", "Backup & restore", "", [
        PermissionDef("backup.read", "View backups", "backup"),
        PermissionDef("backup.export", "Export data", "backup"),
        PermissionDef("backup.import", "Import data", "backup", dangerous=True),
        PermissionDef("backup.create", "Create a database backup", "backup"),
        PermissionDef("backup.restore", "Restore the database", "backup", dangerous=True),
        PermissionDef("backup.delete", "Delete a backup file", "backup", dangerous=True),
    ]),
    PermissionGroup("status", "Status changes", "", [
        PermissionDef("status.read", "View status history", "status"),
        PermissionDef("status.change", "Change an entity's status", "status"),
    ]),
]

ALL_PERMISSIONS: dict[str, PermissionDef] = {
    p.key: p for g in GROUPS for p in g.permissions
}


def permission_keys() -> list[str]:
    return list(ALL_PERMISSIONS)


def catalog_payload() -> list[dict]:
    """Shape the admin UI renders from."""
    return [
        {
            "key": g.key,
            "label": g.label,
            "description": g.description,
            "permissions": [
                {
                    "key": p.key,
                    "label": p.label,
                    "description": p.description,
                    "dangerous": p.dangerous,
                }
                for p in g.permissions
            ],
        }
        for g in GROUPS
        if g.permissions
    ]
