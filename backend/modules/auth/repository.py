from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.models import User, UserPermission
from modules.auth.schemas import UserCreate, UserUpdate
from core.security import hash_password
from shared.filters import apply_filters


async def get_by_id(db: AsyncSession, id: UUID) -> Optional[User]:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    filters: Optional[dict] = None,
) -> list[User]:
    stmt = select(User).where(User.deleted_at.is_(None))
    if filters:
        stmt = apply_filters(stmt, User, filters)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create(db: AsyncSession, obj_in: UserCreate) -> User:
    user = User(
        email=obj_in.email,
        username=obj_in.username,
        hashed_password=hash_password(obj_in.password),
        full_name=obj_in.full_name,
        role=obj_in.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(db: AsyncSession, id: UUID, obj_in: UserUpdate) -> User:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return None  # type: ignore[return-value]
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def soft_delete(db: AsyncSession, id: UUID) -> User:
    stmt = select(User).where(User.id == id, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return None  # type: ignore[return-value]
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    # Free the unique username/email slots so they can be reused
    user.username = f"{user.username}__deleted_{user.id}"
    user.email = f"{user.email}__deleted_{user.id}"
    await db.commit()
    await db.refresh(user)
    return user


async def find_by_email(db: AsyncSession, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_by_username(db: AsyncSession, username: str) -> Optional[User]:
    stmt = select(User).where(User.username == username, User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def count_users(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one()


async def get_permissions(db: AsyncSession, user_id: UUID) -> list[UserPermission]:
    stmt = select(UserPermission).where(UserPermission.user_id == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def set_permissions(
    db: AsyncSession,
    user_id: UUID,
    permissions: dict[str, str],
    scopes: dict[str, str] | None = None,
) -> list[UserPermission]:
    """Replace the user's permission rows with the given section -> level map.

    `scopes` is optional and per-section; a section omitted from it keeps the
    widest scope, so a caller that knows nothing about scopes writes exactly the
    rows it used to.
    """
    from core.permissions import DEFAULT_SCOPE

    scopes = scopes or {}
    existing = {p.section: p for p in await get_permissions(db, user_id)}
    for section, level in permissions.items():
        scope = scopes.get(section, DEFAULT_SCOPE)
        if section in existing:
            existing[section].level = level
            existing[section].scope = scope
        else:
            db.add(
                UserPermission(
                    user_id=user_id, section=section, level=level, scope=scope
                )
            )
    for section, perm in existing.items():
        if section not in permissions:
            await db.delete(perm)
    await db.commit()
    return await get_permissions(db, user_id)