from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.authz import effective_permissions, invalidate_permission_cache
from core.authz_catalog import ALL_PERMISSIONS
from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.auth.models import (
    Role,
    RolePermission,
    User,
    UserPermissionOverride,
    UserRole,
    UserSession,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


def _validate_keys(keys) -> list[str]:
    unknown = sorted(set(keys) - set(ALL_PERMISSIONS))
    if unknown:
        raise BadRequestException(f"Unknown permission keys: {', '.join(unknown)}")
    return sorted(set(keys))


async def _role_payload(db: AsyncSession, role: Role) -> dict:
    perms = (
        await db.execute(
            select(RolePermission.permission_key).where(
                RolePermission.role_id == role.id
            )
        )
    ).scalars().all()
    count = (
        await db.execute(
            select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
        )
    ).scalar_one()
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permissions": sorted(perms),
        "user_count": count,
    }


async def list_roles(db: AsyncSession) -> list[dict]:
    roles = (
        await db.execute(
            select(Role).where(Role.deleted_at.is_(None)).order_by(Role.name)
        )
    ).scalars().all()
    return [await _role_payload(db, r) for r in roles]


async def create_role(
    db: AsyncSession, name: str, description, permissions, user_id: UUID
) -> dict:
    keys = _validate_keys(permissions)
    exists = (
        await db.execute(select(Role).where(Role.name == name))
    ).scalar_one_or_none()
    if exists:
        raise ConflictException(f"A role named {name!r} already exists")

    role = Role(name=name, description=description, is_system=False)
    db.add(role)
    await db.flush()
    for key in keys:
        db.add(RolePermission(role_id=role.id, permission_key=key))
    await record_audit(
        db,
        action="CREATE",
        entity_type="role",
        entity_id=role.id,
        user_id=user_id,
        new_values={"name": name, "permissions": keys},
    )
    await db.commit()
    await db.refresh(role)
    return await _role_payload(db, role)


async def update_role(
    db: AsyncSession, role_id: UUID, name, description, permissions, user_id: UUID
) -> dict:
    role = (
        await db.execute(
            select(Role).where(Role.id == role_id, Role.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not role:
        raise NotFoundException("Role not found")

    if name and name != role.name:
        if role.is_system:
            raise BadRequestException("A system role cannot be renamed")
        role.name = name
    if description is not None:
        role.description = description

    if permissions is not None:
        keys = _validate_keys(permissions)
        await db.execute(
            delete(RolePermission).where(RolePermission.role_id == role.id)
        )
        for key in keys:
            db.add(RolePermission(role_id=role.id, permission_key=key))
        await record_audit(
            db,
            action="UPDATE",
            entity_type="role",
            entity_id=role.id,
            user_id=user_id,
            new_values={"permissions": keys},
        )

    await db.commit()
    # Everyone holding this role just had their access change.
    invalidate_permission_cache()
    await db.refresh(role)
    return await _role_payload(db, role)


async def delete_role(db: AsyncSession, role_id: UUID, user_id: UUID) -> None:
    role = (
        await db.execute(
            select(Role).where(Role.id == role_id, Role.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not role:
        raise NotFoundException("Role not found")
    if role.is_system:
        raise BadRequestException(
            "System roles cannot be deleted. Edit its permissions instead, or "
            "remove it from the people who hold it."
        )

    holders = (
        await db.execute(
            select(func.count()).select_from(UserRole).where(UserRole.role_id == role.id)
        )
    ).scalar_one()
    if holders:
        raise ConflictException(
            f"{holders} user(s) still hold this role. Remove it from them first."
        )

    role.deleted_at = datetime.now(timezone.utc)
    await record_audit(
        db,
        action="DELETE",
        entity_type="role",
        entity_id=role.id,
        user_id=user_id,
    )
    await db.commit()
    invalidate_permission_cache()


async def user_access(db: AsyncSession, user: User) -> dict:
    role_ids = (
        await db.execute(select(UserRole.role_id).where(UserRole.user_id == user.id))
    ).scalars().all()
    roles = []
    if role_ids:
        found = (
            await db.execute(
                select(Role).where(Role.id.in_(role_ids), Role.deleted_at.is_(None))
            )
        ).scalars().all()
        roles = [await _role_payload(db, r) for r in found]

    overrides = (
        await db.execute(
            select(
                UserPermissionOverride.permission_key, UserPermissionOverride.effect
            ).where(UserPermissionOverride.user_id == user.id)
        )
    ).all()

    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "legacy_role": user.role,
        # Surfaced so the admin screen can say plainly that this account's
        # checkboxes are decorative until the legacy role is changed.
        "is_legacy_admin": user.role == "ADMIN",
        "role_ids": list(role_ids),
        "roles": roles,
        "overrides": [{"permission_key": k, "effect": e} for k, e in overrides],
        "effective": sorted(await effective_permissions(db, user)),
    }


async def set_user_access(
    db: AsyncSession, user: User, role_ids, overrides, changed_by: UUID
) -> dict:
    valid_roles = (
        await db.execute(
            select(Role.id).where(Role.id.in_(role_ids or []), Role.deleted_at.is_(None))
        )
    ).scalars().all()
    unknown = set(role_ids or []) - set(valid_roles)
    if unknown:
        raise BadRequestException(f"Unknown role ids: {sorted(str(u) for u in unknown)}")

    parsed = []
    for item in overrides or []:
        key = item.get("permission_key") if isinstance(item, dict) else item.permission_key
        effect = (item.get("effect") if isinstance(item, dict) else item.effect) or "ALLOW"
        if effect not in ("ALLOW", "DENY"):
            raise BadRequestException(f"effect must be ALLOW or DENY, got {effect!r}")
        parsed.append((key, effect))
    _validate_keys(k for k, _ in parsed)

    await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    for rid in valid_roles:
        db.add(UserRole(user_id=user.id, role_id=rid))

    await db.execute(
        delete(UserPermissionOverride).where(UserPermissionOverride.user_id == user.id)
    )
    for key, effect in parsed:
        db.add(
            UserPermissionOverride(
                user_id=user.id, permission_key=key, effect=effect
            )
        )

    await record_audit(
        db,
        action="UPDATE",
        entity_type="user_access",
        entity_id=user.id,
        user_id=changed_by,
        new_values={
            "roles": [str(r) for r in valid_roles],
            "overrides": [{"key": k, "effect": e} for k, e in parsed],
        },
    )
    await db.commit()
    # Without this the change would not be visible for up to the cache TTL,
    # which reads as "the permission screen doesn't work".
    invalidate_permission_cache(user.id)
    return await user_access(db, user)


# --- sessions ---------------------------------------------------------------


async def list_sessions(
    db: AsyncSession, user_id: UUID | None = None, include_ended: bool = False
) -> list[dict]:
    stmt = (
        select(UserSession, User.full_name)
        .join(User, User.id == UserSession.user_id)
        .order_by(UserSession.created_at.desc())
        .limit(500)
    )
    if user_id:
        stmt = stmt.where(UserSession.user_id == user_id)
    if not include_ended:
        stmt = stmt.where(UserSession.revoked_at.is_(None))

    now = datetime.now(timezone.utc)
    out = []
    for session, name in (await db.execute(stmt)).all():
        item = {c.name: getattr(session, c.name) for c in session.__table__.columns}
        item["user_name"] = name
        item["is_active"] = session.revoked_at is None and (
            session.expires_at is None or session.expires_at > now
        )
        out.append(item)
    return out


async def revoke_session(db: AsyncSession, session_id: UUID, user_id: UUID) -> None:
    session = (
        await db.execute(select(UserSession).where(UserSession.id == session_id))
    ).scalar_one_or_none()
    if not session:
        raise NotFoundException("Session not found")
    if session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        await record_audit(
            db,
            action="DELETE",
            entity_type="user_session",
            entity_id=session.id,
            user_id=user_id,
        )
        await db.commit()


async def revoke_all_for_user(db: AsyncSession, target_user_id: UUID, user_id: UUID) -> int:
    sessions = (
        await db.execute(
            select(UserSession).where(
                UserSession.user_id == target_user_id,
                UserSession.revoked_at.is_(None),
            )
        )
    ).scalars().all()
    now = datetime.now(timezone.utc)
    for s in sessions:
        s.revoked_at = now
    if sessions:
        await record_audit(
            db,
            action="DELETE",
            entity_type="user_session",
            entity_id=target_user_id,
            user_id=user_id,
            new_values={"revoked": len(sessions)},
        )
        await db.commit()
    return len(sessions)
