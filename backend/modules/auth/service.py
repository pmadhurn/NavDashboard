import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth import repository
from modules.auth.models import User
from modules.auth.schemas import UserCreate, UserUpdate, UserResponse, TokenResponse
from core.security import verify_password, create_access_token, hash_password
from core.exceptions import (
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


async def register_user(db: AsyncSession, user_in: UserCreate, current_user_role: str) -> User:
    if current_user_role != "ADMIN":
        raise ForbiddenException("Only admins can create users")

    existing_email = await repository.find_by_email(db, user_in.email)
    if existing_email:
        raise ConflictException("Email already registered")

    existing_username = await repository.find_by_username(db, user_in.username)
    if existing_username:
        raise ConflictException("Username already taken")

    user = await repository.create(db, user_in)
    await record_audit(
        db,
        entity_type="user",
        entity_id=user.id,
        action="CREATE",
        changes={"email": user.email, "username": user.username, "role": user.role},
    )
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> TokenResponse:
    user = await repository.find_by_email(db, email)
    if not user:
        raise UnauthorizedException("Invalid email or password")

    if not verify_password(password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)

    user_response = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, user=user_response)


async def get_profile(db: AsyncSession, user_id: UUID) -> User:
    user = await repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    return user


async def update_profile(db: AsyncSession, user_id: UUID, user_in: UserUpdate) -> User:
    user = await repository.update(db, user_id, user_in)
    if not user:
        raise NotFoundException("User not found")
    return user


async def change_password(
    db: AsyncSession, user_id: UUID, old_password: str, new_password: str
) -> None:
    user = await repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")

    if not verify_password(old_password, user.hashed_password):
        raise UnauthorizedException("Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def ensure_default_admin(db: AsyncSession) -> None:
    count = await repository.count_users(db)
    if count == 0:
        admin_in = UserCreate(
            email="admin@navdashboard.local",
            username="admin",
            password="admin123",
            full_name="Administrator",
            role="ADMIN",
        )
        await repository.create(db, admin_in)
        logger.warning("Default admin account created. Change the password immediately!")
    else:
        logger.info("Users exist, skipping default admin creation.")