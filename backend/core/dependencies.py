from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_access_token
from core.exceptions import UnauthorizedException, ForbiddenException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
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


def require_permission(section: str, level: str = "VIEW"):
    """Route dependency: current user must have at least `level` on `section`."""

    async def permission_checker(
        current_user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        from core.permissions import LEVEL_NONE, level_satisfies

        perm_map = await get_permission_map(db, current_user)
        user_level = perm_map.get(section, LEVEL_NONE)
        if not level_satisfies(user_level, level):
            raise ForbiddenException("Insufficient permissions")
        return current_user

    return permission_checker