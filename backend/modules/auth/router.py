from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user, get_permission_map, require_role
from modules.auth.models import User
from modules.auth.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserUpdate,
    UserResponse,
    PasswordChange,
    PermissionsUpdate,
    GoogleLoginRequest,
    GoogleAuthResponse,
    ClerkAuthResponse,
    ClerkConfigResponse,
    ClerkLoginRequest,
)
from modules.auth import service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.authenticate(db, body.email, body.password)


@router.get("/clerk/config", response_model=ClerkConfigResponse)
async def clerk_config():
    """Lets the frontend decide whether to render the Clerk button.

    Public on purpose: a publishable key is designed to ship to browsers.
    """
    from modules.auth import clerk
    from core.config import settings as _s

    return ClerkConfigResponse(
        enabled=clerk.is_configured(),
        publishable_key=getattr(_s, "CLERK_PUBLISHABLE_KEY", "") or None,
    )


@router.post("/clerk", response_model=ClerkAuthResponse)
async def clerk_login(body: ClerkLoginRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a Clerk session for an app token. Roles stay in this app."""
    from modules.auth import clerk

    return await clerk.clerk_authenticate(db, body.token)


@router.post("/google", response_model=GoogleAuthResponse)
async def google_login(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    return await service.google_authenticate(db, body.credential)


@router.get("/users/basic")
async def list_users_basic(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Minimal user directory (id + name) for share/assign pickers."""
    from modules.auth import repository

    users = await repository.get_multi(db, limit=500, filters={"status": "ACTIVE"})
    return [
        {"id": str(u.id), "full_name": u.full_name, "username": u.username}
        for u in users
        if u.is_active
    ]


@router.get("/users/pending", response_model=list[UserResponse])
async def list_pending_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    from modules.auth import repository
    return await repository.get_multi(db, filters={"status": "PENDING"})


@router.post("/users/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.approve_user(db, user_id, approved_by=current_user.id)


@router.post("/register", response_model=UserResponse)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.register_user(db, body, current_user.role)


@router.get("/me", response_model=UserResponse)
async def me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    response = UserResponse.model_validate(current_user)
    response.permissions = await get_permission_map(db, current_user)
    return response


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_profile(db, current_user.id, body)


@router.put("/me/password")
async def change_password(
    body: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.change_password(db, current_user.id, body.old_password, body.new_password)
    return {"detail": "Password changed successfully"}


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    from modules.auth import repository
    return await repository.get_multi(db, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.get_profile(db, user_id)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    return await service.update_profile(db, user_id, body)


@router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    user = await service.get_profile(db, user_id)
    return {"permissions": await get_permission_map(db, user)}


@router.put("/users/{user_id}/permissions")
async def set_user_permissions(
    user_id: UUID,
    body: PermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    permissions = await service.update_permissions(
        db, user_id, body.permissions, changed_by=current_user.id
    )
    return {"permissions": permissions}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN")),
):
    from modules.auth import repository
    user = await repository.soft_delete(db, user_id)
    if not user:
        from core.exceptions import NotFoundException
        raise NotFoundException("User not found")
    return {"detail": "User deleted"}