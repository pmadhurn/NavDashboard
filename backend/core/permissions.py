"""Per-section permission constants and helpers.

Access control is a map of section -> level per user, plus a section -> scope
map answering *whose* records that level applies to. ADMIN role bypasses all
checks. Levels are ordered: NONE < VIEW < EDIT < MANAGE. Scopes are ordered:
SELF < TEAM < ALL.

Level answers "may this user touch Finance at all?"; scope answers "may they
touch *someone else's* expense?". Attendance and daily updates make the second
question unavoidable — a technician logs their own day, a team lead approves
their team's, leadership reads everyone's.
"""

SECTIONS = [
    "devices",
    "inventory",
    "projects",
    "downloads",
    "finance",
    "personnel",
    "documents",
    "troubleshooting",
    "reports",
    "ai",
    "admin",
    # Added 2026-08-11 for the attendance / daily-update / leadership modules.
    "attendance",
    "updates",
    "leadership",
    "exports",
]

LEVEL_NONE = "NONE"
LEVEL_VIEW = "VIEW"
LEVEL_EDIT = "EDIT"
LEVEL_MANAGE = "MANAGE"

LEVELS = [LEVEL_NONE, LEVEL_VIEW, LEVEL_EDIT, LEVEL_MANAGE]

_LEVEL_ORDER = {level: i for i, level in enumerate(LEVELS)}

SCOPE_SELF = "SELF"
SCOPE_TEAM = "TEAM"
SCOPE_ALL = "ALL"

SCOPES = [SCOPE_SELF, SCOPE_TEAM, SCOPE_ALL]

_SCOPE_ORDER = {scope: i for i, scope in enumerate(SCOPES)}

# Every pre-existing row and every pre-existing check predates the scope
# dimension, so the widest scope is the default: adding the column must not
# narrow anyone's access.
DEFAULT_SCOPE = SCOPE_ALL


def level_satisfies(user_level: str, required_level: str) -> bool:
    return _LEVEL_ORDER.get(user_level, 0) >= _LEVEL_ORDER.get(required_level, 0)


def scope_satisfies(user_scope: str, required_scope: str) -> bool:
    """True if `user_scope` is at least as wide as `required_scope`."""
    return _SCOPE_ORDER.get(user_scope, 0) >= _SCOPE_ORDER.get(required_scope, 0)


# Permission maps seeded for legacy roles when a user has no explicit rows.
ROLE_DEFAULT_PERMISSIONS: dict[str, dict[str, str]] = {
    "TECHNICIAN": {
        "devices": LEVEL_EDIT,
        "inventory": LEVEL_EDIT,
        "documents": LEVEL_EDIT,
        "troubleshooting": LEVEL_EDIT,
        "downloads": LEVEL_EDIT,
        "projects": LEVEL_EDIT,
        "personnel": LEVEL_VIEW,
        "attendance": LEVEL_EDIT,
        "updates": LEVEL_EDIT,
        "exports": LEVEL_EDIT,
    },
    "VIEWER": {
        "devices": LEVEL_VIEW,
        "inventory": LEVEL_VIEW,
        "documents": LEVEL_VIEW,
        "troubleshooting": LEVEL_VIEW,
        "downloads": LEVEL_VIEW,
        "projects": LEVEL_VIEW,
        "attendance": LEVEL_VIEW,
        "updates": LEVEL_VIEW,
    },
}

# Scopes paired with the level maps above. A section absent here is DEFAULT_SCOPE.
# A technician may edit *their own* attendance and updates, but read everyone's
# device records — which is why scope is per-section and not per-user.
ROLE_DEFAULT_SCOPES: dict[str, dict[str, str]] = {
    "TECHNICIAN": {
        "attendance": SCOPE_SELF,
        "updates": SCOPE_SELF,
        "exports": SCOPE_SELF,
    },
    "VIEWER": {
        "attendance": SCOPE_SELF,
    },
}


def full_access_map() -> dict[str, str]:
    return {section: LEVEL_MANAGE for section in SECTIONS}


def full_scope_map() -> dict[str, str]:
    return {section: SCOPE_ALL for section in SECTIONS}
