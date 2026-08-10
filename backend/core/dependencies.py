from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_access_token
from core.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    # The app-level `enforce_permissions` dependency has already authenticated
    # this request and stashed the user. Reusing it keeps the cost at one
    # lookup per request rather than two.
    cached = getattr(request.state, "user", None)
    if cached is not None:
        return cached

    from modules.auth.models import User

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    from sqlalchemy import select

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.deleted_at is not None:
        raise UnauthorizedException("User not found")

    if not user.is_active:
        raise UnauthorizedException("Account disabled")

    if getattr(user, "status", "ACTIVE") == "PENDING":
        raise UnauthorizedException("Account is awaiting admin approval")

    return user


def require_role(*roles: str):
    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return role_checker


async def get_permission_map(db: AsyncSession, user) -> dict[str, str]:
    """Resolve a user's section -> level map.

    ADMIN role gets full access. Users without explicit rows fall back to
    their legacy role's default map.
    """
    from core.permissions import ROLE_DEFAULT_PERMISSIONS, full_access_map
    from modules.auth.repository import get_permissions

    if user.role == "ADMIN":
        return full_access_map()

    rows = await get_permissions(db, user.id)
    if rows:
        return {row.section: row.level for row in rows}
    return dict(ROLE_DEFAULT_PERMISSIONS.get(user.role, {}))


async def get_scope_map(db: AsyncSession, user) -> dict[str, str]:
    """Resolve a user's section -> scope map (SELF | TEAM | ALL).

    Deliberately separate from `get_permission_map` rather than folded into it:
    that map's section -> level shape is the payload the frontend's
    `hasPermission` hydrates from and is read by six call sites, so widening its
    return type would ripple through all of them for no gain.
    """
    from core.permissions import (
        DEFAULT_SCOPE,
        ROLE_DEFAULT_PERMISSIONS,
        ROLE_DEFAULT_SCOPES,
        full_scope_map,
    )
    from modules.auth.repository import get_permissions

    if user.role == "ADMIN":
        return full_scope_map()

    rows = await get_permissions(db, user.id)
    if rows:
        return {row.section: getattr(row, "scope", DEFAULT_SCOPE) for row in rows}

    role_scopes = ROLE_DEFAULT_SCOPES.get(user.role, {})
    return {
        section: role_scopes.get(section, DEFAULT_SCOPE)
        for section in ROLE_DEFAULT_PERMISSIONS.get(user.role, {})
    }


async def get_current_person_id(db: AsyncSession, user):
    """The `personnel` row linked to this login, or None if there is no link.

    Scope checks are expressed against personnel, not users: attendance days and
    expenses belong to a person, and a person may exist with no login at all.
    """
    from sqlalchemy import select

    from modules.personnel.models import Person

    stmt = select(Person.id).where(
        Person.user_id == user.id, Person.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def assert_scope(db: AsyncSession, user, section: str, target_person_id) -> None:
    """Raise unless `user`'s scope on `section` reaches `target_person_id`.

    ALL  — any person.
    TEAM — the caller, plus anyone whose `team_lead_id` is the caller.
    SELF — the caller only.

    A caller whose scope is narrower than ALL but who has *no* personnel record
    can reach nobody: there is no identity to compare against, and falling open
    there would make an unlinked login the most privileged kind.
    """
    from core.permissions import DEFAULT_SCOPE, SCOPE_ALL, SCOPE_SELF, SCOPE_TEAM

    scope_map = await get_scope_map(db, user)
    scope = scope_map.get(section, DEFAULT_SCOPE)

    if scope == SCOPE_ALL:
        return
    if target_person_id is None:
        raise ForbiddenException("No target record to check scope against")

    caller_person_id = await get_current_person_id(db, user)
    if caller_person_id is None:
        raise ForbiddenException(
            "This login is not linked to a personnel record, so it cannot act "
            "on person-scoped data"
        )

    if str(caller_person_id) == str(target_person_id):
        return
    if scope == SCOPE_SELF:
        raise ForbiddenException("You may only act on your own records")

    if scope == SCOPE_TEAM:
        from sqlalchemy import select

        from modules.personnel.models import Person

        stmt = select(Person.team_lead_id).where(Person.id == target_person_id)
        result = await db.execute(stmt)
        lead_id = result.scalar_one_or_none()
        if lead_id is not None and str(lead_id) == str(caller_person_id):
            return
        raise ForbiddenException("You may only act on your own team's records")

    raise ForbiddenException("Insufficient permissions")


def person_from_path(param: str = "person_id"):
    """Scope resolver reading the target person from a path parameter."""

    async def resolver(request):
        return request.path_params.get(param)

    return resolver


def person_from_body(field: str = "person_id"):
    """Scope resolver reading the target person from a JSON body field.

    Starlette caches the body on the request, so consuming it here does not
    prevent the route from parsing its own model afterwards.
    """

    async def resolver(request):
        try:
            body = await request.json()
        except Exception:
            return None
        if not isinstance(body, dict):
            return None
        return body.get(field)

    return resolver


def require_permission(section: str, level: str = "VIEW", scope_owner=None):
    """Route dependency: current user must have at least `level` on `section`.

    When `scope_owner` is supplied it resolves the *target* person from the
    request, and the caller's scope on `section` must reach them. Without it the
    check is level-only, which is what every pre-existing call site expects.
    """

    async def permission_checker(
        request: Request,
        current_user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        from core.permissions import LEVEL_NONE, level_satisfies

        perm_map = await get_permission_map(db, current_user)
        user_level = perm_map.get(section, LEVEL_NONE)
        if not level_satisfies(user_level, level):
            raise ForbiddenException("Insufficient permissions")

        if scope_owner is not None:
            target = await scope_owner(request)
            await assert_scope(db, current_user, section, target)

        return current_user

    return permission_checker