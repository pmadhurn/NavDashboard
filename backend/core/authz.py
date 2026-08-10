"""Central authorization: one check, on every request, for every operation.

The design in one paragraph. Every endpoint is mapped to a permission key in
`authz_endpoints.ENDPOINT_PERMISSIONS`. A single dependency registered on the
FastAPI app itself resolves the matched route, looks up its key, and denies
unless the caller holds it. Nothing is opt-in: an endpoint that forgets to
declare a permission does not ship unguarded, it stops the app from booting.

Why an app-level dependency rather than a decorator per route: the property that
matters is *no operation escapes*, which is a statement about the whole route
table. A per-route decorator can be forgotten on the one route that matters;
`assert_full_coverage()` cannot be.

Why not middleware: middleware runs before routing resolves, so it cannot see
which endpoint was matched — only the raw path, which would mean re-implementing
route matching and getting it subtly wrong.
"""

from __future__ import annotations

import logging
import time
from typing import Optional
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.authz_catalog import ALL_PERMISSIONS, AUTHENTICATED, PUBLIC
from core.authz_endpoints import ENDPOINT_PERMISSIONS
from core.database import get_db
from core.exceptions import ForbiddenException, UnauthorizedException

logger = logging.getLogger(__name__)

# Effective-permission cache. Without it every request costs three extra
# queries (roles, role permissions, overrides). The TTL is the revocation lag
# for a *permission change* — a session revocation is not cached and takes
# effect immediately.
_PERM_CACHE: dict[str, tuple[float, frozenset[str]]] = {}
PERM_CACHE_TTL_SECONDS = 30.0


def invalidate_permission_cache(user_id=None) -> None:
    """Drop cached permissions so a grant takes effect without waiting out the TTL."""
    if user_id is None:
        _PERM_CACHE.clear()
    else:
        _PERM_CACHE.pop(str(user_id), None)


def endpoint_key(endpoint) -> str:
    return f"{endpoint.__module__}.{endpoint.__name__}"


def permission_for_route(route) -> Optional[str]:
    endpoint = getattr(route, "endpoint", None)
    if endpoint is None:
        return None
    return ENDPOINT_PERMISSIONS.get(endpoint_key(endpoint))


def iter_api_routes(app):
    """Every registered API operation.

    This FastAPI version wraps `include_router()` results in `_IncludedRouter`,
    whose real routes hang off `.original_router` and whose prefix lives on
    `.include_context.prefix`. A flat walk of `app.routes` finds exactly one
    route and would cheerfully report full coverage.
    """

    def walk(routes, prefix=""):
        for r in routes:
            if type(r).__name__ == "_IncludedRouter":
                p = getattr(r.include_context, "prefix", "") or ""
                yield from walk(r.original_router.routes, prefix + p)
                continue
            path = prefix + getattr(r, "path", "")
            methods = getattr(r, "methods", None)
            if methods and path.startswith("/api/v1"):
                yield r, path, methods

    yield from walk(app.routes)


def assert_full_coverage(app) -> None:
    """Refuse to start if any operation has no permission mapping.

    This is the load-bearing part of the whole design. A central map without
    this assertion drifts exactly the way the old scattered `require_role`
    calls did.
    """
    missing, unknown = [], []
    for route, path, methods in iter_api_routes(app):
        key = permission_for_route(route)
        verbs = ",".join(sorted(m for m in methods if m not in ("HEAD", "OPTIONS")))
        if key is None:
            missing.append(f"{verbs} {path}  ({endpoint_key(route.endpoint)})")
        elif key not in (PUBLIC, AUTHENTICATED) and key not in ALL_PERMISSIONS:
            unknown.append(f"{verbs} {path} -> {key}")

    if missing or unknown:
        lines = ["Authorization coverage check FAILED."]
        if missing:
            lines.append(
                f"{len(missing)} operation(s) have no entry in "
                f"core/authz_endpoints.py:"
            )
            lines += [f"    {m}" for m in missing]
        if unknown:
            lines.append(f"{len(unknown)} operation(s) map to an unknown key:")
            lines += [f"    {u}" for u in unknown]
        lines.append(
            "Add the endpoint to ENDPOINT_PERMISSIONS (and the key to "
            "core/authz_catalog.py) before starting."
        )
        raise RuntimeError("\n".join(lines))

    total = sum(
        1
        for _, _, methods in iter_api_routes(app)
        for m in methods
        if m not in ("HEAD", "OPTIONS")
    )
    logger.info("Authorization coverage: %d/%d operations mapped.", total, total)


async def effective_permissions(db: AsyncSession, user) -> frozenset[str]:
    """Every permission key this user holds.

    roles ∪ per-user ALLOW overrides − per-user DENY overrides.

    A DENY override beats everything: it is the only way to take one capability
    away from someone who otherwise needs the role that grants it.
    """
    from modules.auth.models import RolePermission, UserPermissionOverride, UserRole

    # The legacy ADMIN role keeps full access. Deliberate: the alternative is a
    # migration that can lock every administrator out of the system that grants
    # permissions. Verification therefore never runs as ADMIN — see
    # scripts/verify-authz.py, which uses non-admin personas precisely because
    # this branch would hide every mistake.
    if getattr(user, "role", None) == "ADMIN":
        return frozenset(ALL_PERMISSIONS)

    cache_key = str(user.id)
    now = time.monotonic()
    hit = _PERM_CACHE.get(cache_key)
    if hit and hit[0] > now:
        return hit[1]

    granted: set[str] = set()

    role_rows = (
        await db.execute(
            select(RolePermission.permission_key)
            .join(UserRole, UserRole.role_id == RolePermission.role_id)
            .where(UserRole.user_id == user.id)
        )
    ).scalars()
    granted.update(role_rows)

    overrides = (
        await db.execute(
            select(
                UserPermissionOverride.permission_key,
                UserPermissionOverride.effect,
            ).where(UserPermissionOverride.user_id == user.id)
        )
    ).all()
    for key, effect in overrides:
        if effect == "ALLOW":
            granted.add(key)
        else:
            granted.discard(key)

    # Keys that no longer exist in the catalog are dropped rather than trusted:
    # a renamed permission must not keep granting access under its old name.
    result = frozenset(k for k in granted if k in ALL_PERMISSIONS)
    _PERM_CACHE[cache_key] = (now + PERM_CACHE_TTL_SECONDS, result)
    return result


async def _user_from_request(request: Request, db: AsyncSession):
    """Resolve and cache the caller on the request.

    `get_current_user` reads `request.state.user` first, so the enforcement
    dependency and the route handler share one database lookup rather than two.
    """
    from jose import JWTError

    from core.security import decode_access_token
    from modules.auth.models import User

    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer" or not token:
        raise UnauthorizedException("Not authenticated")

    try:
        payload = decode_access_token(token)
    except JWTError:
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    if not user or user.deleted_at is not None:
        raise UnauthorizedException("User not found")
    if not user.is_active:
        raise UnauthorizedException("Account disabled")
    if getattr(user, "status", "ACTIVE") == "PENDING":
        raise UnauthorizedException("Account is awaiting admin approval")

    await _assert_session_active(db, request, payload, user)

    request.state.user = user
    request.state.token_payload = payload
    return user


async def _assert_session_active(db: AsyncSession, request: Request, payload, user) -> None:
    """A token whose session has been revoked is dead immediately.

    Tokens issued before sessions existed carry no `jti`; those are accepted so
    that adding this does not sign everyone out. New tokens always carry one.
    """
    from modules.auth.models import UserSession

    jti = payload.get("jti")
    if not jti:
        return

    session = (
        await db.execute(select(UserSession).where(UserSession.jti == jti))
    ).scalar_one_or_none()
    if session is None:
        # A jti we never issued, or a session row that has been deleted.
        raise UnauthorizedException("Session is no longer valid")
    if session.revoked_at is not None:
        raise UnauthorizedException("Session has been signed out")

    request.state.session = session


async def enforce_permissions(request: Request, db: AsyncSession = Depends(get_db)):
    """Registered on the app, so it runs for every route including future ones."""
    route = request.scope.get("route")
    if route is None:
        return

    path = request.scope.get("path", "")
    if not path.startswith("/api/v1"):
        return

    required = permission_for_route(route)

    if required is None:
        # assert_full_coverage() runs at startup, so this is unreachable unless
        # a route was registered afterwards. Deny rather than guess.
        logger.error("No permission mapping for %s — denying.", path)
        raise ForbiddenException("This operation has no permission mapping")

    if required == PUBLIC:
        return

    user = await _user_from_request(request, db)

    if required == AUTHENTICATED:
        return

    granted = await effective_permissions(db, user)
    if required not in granted:
        logger.info(
            "DENY user=%s permission=%s path=%s", user.id, required, path
        )
        raise ForbiddenException(f"You do not have permission: {required}")


async def user_has(db: AsyncSession, user, key: str) -> bool:
    return key in await effective_permissions(db, user)
