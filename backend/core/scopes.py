"""Row-ownership scope: *whose* records, as opposed to *what* a user may do.

Deliberately separate from the permission catalog. A permission key answers
"may this user log attendance at all"; a scope answers "whose attendance". The
two are orthogonal, so folding scope into the key model would have multiplied
every key by three.
"""

SCOPE_SELF = "SELF"
SCOPE_TEAM = "TEAM"
SCOPE_ALL = "ALL"

SCOPES = [SCOPE_SELF, SCOPE_TEAM, SCOPE_ALL]

_SCOPE_ORDER = {scope: i for i, scope in enumerate(SCOPES)}

# Anything not narrowed is unrestricted, so adding scope to a check never
# silently takes access away from someone who had it.
DEFAULT_SCOPE = SCOPE_ALL

# Default row-ownership per legacy role, used when a person has no explicit
# narrowing. A technician edits their own attendance and updates, but reads
# every device — which is why scope is per-section rather than per-user.
ROLE_DEFAULT_SCOPES: dict[str, dict[str, str]] = {
    "TECHNICIAN": {
        "attendance": SCOPE_SELF,
        "updates": SCOPE_SELF,
        "finance": SCOPE_SELF,
    },
    "VIEWER": {
        "attendance": SCOPE_SELF,
        "finance": SCOPE_SELF,
    },
}


def scope_satisfies(user_scope: str, required_scope: str) -> bool:
    """True if `user_scope` is at least as wide as `required_scope`."""
    return _SCOPE_ORDER.get(user_scope, 0) >= _SCOPE_ORDER.get(required_scope, 0)
