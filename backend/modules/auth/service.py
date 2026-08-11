import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth import repository
from modules.auth.models import User
from modules.auth.schemas import (
    UserCreate,
    UserUpdate,
    UserResponse,
    TokenResponse,
    GoogleAuthResponse,
)
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
        action="CREATE",
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
        new_values={"email": user.email, "username": user.username, "role": user.role},
    )
    return user


async def authenticate(
    db: AsyncSession, email: str, password: str, request=None
) -> TokenResponse:
    user = await repository.find_by_email(db, email)
    if not user:
        raise UnauthorizedException("Invalid email or password")

    if not user.hashed_password or not verify_password(password, user.hashed_password):
        raise UnauthorizedException("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    if user.status == "PENDING":
        raise UnauthorizedException("Account is awaiting admin approval")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    access_token = await issue_session(db, user, provider="LOCAL", request=request)

    user_response = UserResponse.model_validate(user)
    user_response.permissions = await effective_permission_list(db, user)
    return TokenResponse(access_token=access_token, user=user_response)


async def google_authenticate(
    db: AsyncSession, credential: str, request=None
) -> GoogleAuthResponse:
    """Verify a Google ID token; sign in existing users, queue unknown ones as PENDING."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    from core.config import settings

    if not settings.GOOGLE_CLIENT_ID:
        raise UnauthorizedException("Google sign-in is not configured")

    from starlette.concurrency import run_in_threadpool

    try:
        claims = await run_in_threadpool(
            google_id_token.verify_oauth2_token,
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise UnauthorizedException("Invalid Google credential")

    email = claims.get("email")
    if not email or not claims.get("email_verified", False):
        raise UnauthorizedException("Google account email is not verified")

    full_name = claims.get("name") or email.split("@")[0]

    user = await repository.find_by_email(db, email)
    if user is None:
        user = await create_pending_google_user(db, email=email, full_name=full_name)
        return GoogleAuthResponse(
            pending=True,
            message="Account created. An admin needs to approve it before you can sign in.",
        )

    if user.status == "PENDING":
        return GoogleAuthResponse(
            pending=True,
            message="Your account is still awaiting admin approval.",
        )

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    user.last_login = datetime.now(timezone.utc)
    if user.auth_provider == "LOCAL" and user.hashed_password is None:
        user.auth_provider = "GOOGLE"
    await db.commit()
    await db.refresh(user)

    access_token = await issue_session(db, user, provider="GOOGLE", request=request)

    user_response = UserResponse.model_validate(user)
    user_response.permissions = await effective_permission_list(db, user)
    return GoogleAuthResponse(
        token=TokenResponse(access_token=access_token, user=user_response)
    )


async def create_pending_google_user(
    db: AsyncSession, email: str, full_name: str
) -> User:
    base_username = email.split("@")[0][:40] or "user"
    username = base_username
    suffix = 1
    while await repository.find_by_username(db, username):
        suffix += 1
        username = f"{base_username}{suffix}"

    user = User(
        email=email,
        username=username,
        hashed_password=None,
        full_name=full_name[:100],
        role="VIEWER",
        is_active=True,
        auth_provider="GOOGLE",
        status="PENDING",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await record_audit(
        db,
        action="CREATE",
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
        new_values={"email": email, "auth_provider": "GOOGLE", "status": "PENDING"},
    )
    return user


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

    if not user.hashed_password or not verify_password(old_password, user.hashed_password):
        raise UnauthorizedException("Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def approve_user(db: AsyncSession, user_id: UUID, approved_by: UUID) -> User:
    user = await repository.get_by_id(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    if user.status != "PENDING":
        raise ConflictException("User is not pending approval")

    user.status = "ACTIVE"
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="user",
        entity_id=user.id,
        user_id=approved_by,
        old_values={"status": "PENDING"},
        new_values={"status": "ACTIVE"},
    )

    # Best-effort: link this login to an existing personnel record with the same
    # email so field-staff and login identities converge. Never fails approval.
    try:
        from sqlalchemy import func, select

        from modules.personnel.models import Person

        if user.email:
            person = (
                await db.execute(
                    select(Person).where(
                        func.lower(Person.email) == user.email.lower(),
                        Person.user_id.is_(None),
                        Person.deleted_at.is_(None),
                    )
                )
            ).scalar_one_or_none()
            if person:
                person.user_id = user.id
                await db.commit()
    except Exception as exc:
        logger.warning("Personnel link on approve failed for %s: %s", user.id, exc)

    return user


async def ensure_default_admin(db: AsyncSession) -> None:
    count = await repository.count_users(db)
    if count == 0:
        admin_in = UserCreate(
            email="admin@navdashboard.com",
            username="Madhur",
            password="admin123",
            full_name="Madhur",
            role="ADMIN",
        )
        await repository.create(db, admin_in)
        logger.warning("Default admin account created. Change the password immediately!")
    else:
        logger.info("Users exist, skipping default admin creation.")

async def issue_session(
    db: AsyncSession, user, provider: str = "LOCAL", request=None
) -> str:
    """Mint a token and the session row that makes it revocable.

    Every sign-in path goes through here — password, Google and Clerk — so the
    admin sees one uniform list of who is signed in, regardless of how they got
    there.
    """
    from datetime import timedelta

    from core.config import settings
    from core.security import create_access_token, new_jti
    from modules.auth.models import UserSession

    jti = new_jti()
    now = datetime.now(timezone.utc)
    db.add(
        UserSession(
            user_id=user.id,
            jti=jti,
            auth_provider=provider,
            ip_address=(getattr(getattr(request, "client", None), "host", None) or None),
            user_agent=(request.headers.get("user-agent")[:400] if request else None),
            expires_at=now + timedelta(minutes=settings.JWT_EXPIRY_MINUTES),
            last_seen_at=now,
        )
    )
    await db.commit()
    return create_access_token(subject=user.id, role=user.role, jti=jti)


async def effective_permission_list(db: AsyncSession, user) -> list[str]:
    """The permission keys the frontend gates its nav and buttons with."""
    from core.authz import effective_permissions

    return sorted(await effective_permissions(db, user))
