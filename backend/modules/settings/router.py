from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.auth.schemas import UserCreate, UserUpdate, UserResponse
from modules.auth import repository as auth_repo
from modules.auth import service as auth_service
from modules.settings import service
from modules.settings.schemas import (
    SettingResponse,
    SettingUpdate,
    SystemInfoResponse,
)

router = APIRouter()


@router.get("/", response_model=list[SettingResponse])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all system settings."""
    return await service.get_all_settings(db)


@router.get("/system-info", response_model=SystemInfoResponse)
async def system_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get system information summary."""
    return await service.get_system_info(db)


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    body: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a system setting (admin only)."""
    return await service.update_setting(db, key, body.value, current_user.id)


# ── User Management (thin wrappers around auth module) ──────────────


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users (admin only)."""
    return await auth_repo.get_multi(db)


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user (admin only)."""
    return await auth_service.register_user(db, body, current_user.role)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user (admin only)."""
    return await auth_service.update_profile(db, user_id, body)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate a user (admin only)."""
    user = await auth_repo.soft_delete(db, user_id)
    if not user:
        from core.exceptions import NotFoundException

        raise NotFoundException("User not found")
    return {"detail": "User deactivated"}
