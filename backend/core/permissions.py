"""Per-section permission constants and helpers.

Access control is a map of section -> level per user. ADMIN role bypasses
all checks. Levels are ordered: NONE < VIEW < EDIT < MANAGE.
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
]

LEVEL_NONE = "NONE"
LEVEL_VIEW = "VIEW"
LEVEL_EDIT = "EDIT"
LEVEL_MANAGE = "MANAGE"

LEVELS = [LEVEL_NONE, LEVEL_VIEW, LEVEL_EDIT, LEVEL_MANAGE]

_LEVEL_ORDER = {level: i for i, level in enumerate(LEVELS)}


def level_satisfies(user_level: str, required_level: str) -> bool:
    return _LEVEL_ORDER.get(user_level, 0) >= _LEVEL_ORDER.get(required_level, 0)


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
    },
    "VIEWER": {
        "devices": LEVEL_VIEW,
        "inventory": LEVEL_VIEW,
        "documents": LEVEL_VIEW,
        "troubleshooting": LEVEL_VIEW,
        "downloads": LEVEL_VIEW,
        "projects": LEVEL_VIEW,
    },
}


def full_access_map() -> dict[str, str]:
    return {section: LEVEL_MANAGE for section in SECTIONS}
