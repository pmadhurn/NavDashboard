"""Clerk sign-in, as an identity provider only.

Clerk verifies who someone is. It does **not** own authorisation here — role,
the `user_permissions` matrix and the PENDING-approval flow all stay in this
app's `users` table, exactly as they do for Google sign-in. A Clerk session is
exchanged for one of this app's own JWTs, so every downstream permission check
is unchanged.

Inert until CLERK_JWKS_URL (or CLERK_ISSUER) is configured; the endpoint returns
"not configured" rather than failing in a confusing way.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.exceptions import UnauthorizedException
from modules.auth import repository

logger = logging.getLogger(__name__)

# JWKS rarely rotates; refetching per request would add a round trip to every
# sign-in and hand Clerk a trivial DoS on our login path.
_JWKS_CACHE: dict[str, Any] = {"keys": None, "fetched_at": 0.0, "last_forced": 0.0}
_JWKS_TTL_SECONDS = 3600
# Floor between forced (unknown-kid) refetches. Without it, /auth/clerk is an
# unauthenticated endpoint that triggers an outbound HTTPS request to Clerk for
# every request carrying a junk `kid` — i.e. the caller picks the header and we
# obediently hammer our own identity provider. 60s keeps rotation recovery fast
# (one minute, not the full hour) while collapsing a flood into one fetch.
_JWKS_FORCE_COOLDOWN_SECONDS = 60


def is_configured() -> bool:
    return bool(getattr(settings, "CLERK_JWKS_URL", "") or getattr(settings, "CLERK_ISSUER", ""))


def _jwks_url() -> str:
    explicit = getattr(settings, "CLERK_JWKS_URL", "")
    if explicit:
        return explicit
    return getattr(settings, "CLERK_ISSUER", "").rstrip("/") + "/.well-known/jwks.json"


async def _get_jwks(force: bool = False) -> dict:
    now = time.time()
    cached = _JWKS_CACHE["keys"]

    if not force and cached is not None and now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS:
        return cached

    if force:
        # Rate-limit the attacker-triggerable path. A junk `kid` is free to
        # send; an outbound fetch to Clerk is not.
        if cached is not None and now - _JWKS_CACHE["last_forced"] < _JWKS_FORCE_COOLDOWN_SECONDS:
            return cached
        _JWKS_CACHE["last_forced"] = now

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(_jwks_url())
            resp.raise_for_status()
            keys = resp.json()
    except Exception as exc:
        # Serve a stale cache rather than locking everyone out because Clerk
        # blipped. Only fail hard when there is nothing cached at all.
        logger.warning("JWKS fetch failed (%s); using cached keys: %s", _jwks_url(), exc)
        if cached is not None:
            return cached
        raise UnauthorizedException("Could not reach Clerk to verify the session")

    _JWKS_CACHE["keys"] = keys
    _JWKS_CACHE["fetched_at"] = now
    return keys


async def verify_session_token(token: str) -> dict:
    """Validate a Clerk session JWT against Clerk's JWKS and return its claims."""
    if not is_configured():
        raise UnauthorizedException("Clerk sign-in is not configured")

    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise UnauthorizedException("Malformed Clerk token")

    kid = header.get("kid")
    jwks = await _get_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)

    if key is None:
        # Clerk rotated its signing key since we cached. One forced refetch
        # before giving up, otherwise every user is locked out for up to an hour.
        jwks = await _get_jwks(force=True)
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)

    if key is None:
        raise UnauthorizedException("Unknown Clerk signing key")

    issuer = getattr(settings, "CLERK_ISSUER", "") or None
    try:
        claims = jwt.decode(
            token,
            key,
            algorithms=[header.get("alg", "RS256")],
            issuer=issuer,
            # Clerk session tokens carry no `aud` unless a template adds one.
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise UnauthorizedException(f"Invalid Clerk token: {exc}")

    return claims


def _email_from_claims(claims: dict) -> str | None:
    for field in ("email", "email_address", "primary_email_address"):
        if claims.get(field):
            return str(claims[field]).lower()
    return None


async def _email_from_backend_api(user_id: str) -> str | None:
    """Look the email up via Clerk's Backend API.

    Fallback for the common case: a default Clerk session token carries only
    `sub`, `sid`, `iss`, `azp`, `exp`, `iat`, `nbf` — **no email**. Rather than
    require every deployment to customise its JWT template, fetch it when a
    secret key is available.
    """
    secret = getattr(settings, "CLERK_SECRET_KEY", "")
    if not secret or not user_id:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers={"Authorization": f"Bearer {secret}"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Clerk Backend API lookup failed for %s: %s", user_id, exc)
        return None

    primary_id = data.get("primary_email_address_id")
    for addr in data.get("email_addresses", []):
        if addr.get("id") == primary_id and addr.get("email_address"):
            return str(addr["email_address"]).lower()
    for addr in data.get("email_addresses", []):
        if addr.get("email_address"):
            return str(addr["email_address"]).lower()
    return None


async def clerk_authenticate(db: AsyncSession, token: str, request=None):
    """Exchange a verified Clerk session for this app's own access token.

    Mirrors google_authenticate in every respect that matters: unknown emails
    are queued as PENDING rather than silently granted access, the token comes
    from `issue_session` so it is revocable and shows up in the admin's session
    list, and the response carries the user and their permissions so the client
    needs no second round trip.
    """
    from modules.auth.schemas import ClerkAuthResponse, TokenResponse, UserResponse
    from modules.auth.service import (
        create_pending_google_user,
        effective_permission_list,
        issue_session,
    )

    claims = await verify_session_token(token)

    email = _email_from_claims(claims) or await _email_from_backend_api(claims.get("sub", ""))
    if not email:
        raise UnauthorizedException(
            "Clerk session has no email. Either add an `email` claim to the Clerk "
            "session token template, or set CLERK_SECRET_KEY so it can be looked "
            "up via Clerk's Backend API."
        )

    full_name = (
        claims.get("name")
        or " ".join(filter(None, [claims.get("first_name"), claims.get("last_name")])).strip()
        or email.split("@")[0]
    )

    user = await repository.find_by_email(db, email)
    if user is None:
        await create_pending_google_user(db, email=email, full_name=full_name)
        return ClerkAuthResponse(
            pending=True,
            message="Account created. An admin needs to approve it before you can sign in.",
        )

    if user.status == "PENDING":
        return ClerkAuthResponse(
            pending=True, message="Your account is still awaiting admin approval."
        )

    if not user.is_active:
        raise UnauthorizedException("Account is disabled")

    user.last_login = datetime.now(timezone.utc)
    # Same rule as Google: only claim a row that has no password of its own.
    if user.auth_provider == "LOCAL" and user.hashed_password is None:
        user.auth_provider = "CLERK"
    await db.commit()
    await db.refresh(user)

    # Not create_access_token: a token minted without a session row carries no
    # `jti`, and `_assert_session_active` waves those straight through. Every
    # Clerk sign-in would have been unrevocable for its full lifetime and
    # invisible in the admin's session list.
    access_token = await issue_session(db, user, provider="CLERK", request=request)

    user_response = UserResponse.model_validate(user)
    user_response.permissions = await effective_permission_list(db, user)
    return ClerkAuthResponse(
        pending=False,
        token=TokenResponse(access_token=access_token, user=user_response),
    )
