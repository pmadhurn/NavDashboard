"""Prove that a session can be revoked, and that revocation is immediate.

Run:
    docker cp scripts/verify-sessions.py navdashboard-backend-1:/tmp/vs.py
    docker exec navdashboard-backend-1 python /tmp/vs.py

Creates one throwaway user with a known password, signs in over real HTTP,
uses the token, revokes the session, and shows the same token stop working.
Cleans up in a finally block.

A JWT is otherwise valid until it expires; before user_sessions existed there
was no way to end one. This is the test that says "sign out everywhere" means
now rather than "in up to JWT_EXPIRY_MINUTES".
"""
import asyncio
import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, "/app")

from sqlalchemy import delete, select, text  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.security import hash_password  # noqa: E402
from modules.auth.models import (  # noqa: E402
    Role,
    User,
    UserRole,
    UserSession,
)

BASE = "http://127.0.0.1:8000/api/v1"
EMAIL = "session-probe@example.invalid"
PASSWORD = "Probe!Session1"

results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got={got} want={want}")


def call(method, path, token=None, body=None):
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception as e:  # pragma: no cover
        return f"ERR:{e}", None



async def _purge(db):
    """Remove any leftover probe rows. Safe to call when there are none."""
    from modules.auth.models import User as _U

    ids = (
        await db.execute(select(_U.id).where(_U.email == EMAIL))
    ).scalars().all()
    if not ids:
        return
    for table in ("user_sessions", "user_roles", "user_permission_overrides"):
        await db.execute(
            text(f"DELETE FROM {table} WHERE user_id = ANY(:ids)"), {"ids": ids}
        )
    await db.execute(text("DELETE FROM users WHERE id = ANY(:ids)"), {"ids": ids})
    await db.commit()


async def main():
    async with async_session_factory() as db:
        # Re-runnable: clear any probe row a previously-failed run left
        # behind, or the unique email blocks every future run.
        await _purge(db)

        user = User(
            email=EMAIL,
            username="session_probe",
            hashed_password=hash_password(PASSWORD),
            full_name="Session Probe",
            role="VIEWER",
            is_active=True,
            status="ACTIVE",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Inside the try: anything that can raise after the user exists must be
        # covered by the cleanup, or a failed run strands a row that blocks
        # every subsequent run on the unique email.
        try:
            rigger = (
                await db.execute(select(Role).where(Role.name == "Rigger"))
            ).scalar_one()
            db.add(UserRole(user_id=user.id, role_id=rigger.id))
            await db.commit()

            print("\n1. Signing in mints a session and returns permission keys")
            status, payload = call(
                "POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD}
            )
            check("POST /auth/login", status, 200)
            token = (payload or {}).get("access_token")
            check("token returned", bool(token), True)
            perms = ((payload or {}).get("user") or {}).get("permissions") or []
            check("permissions are keys, not a level map", isinstance(perms, list), True)
            check("devices.read granted by the Rigger role", "devices.read" in perms, True)
            check("devices.delete NOT granted", "devices.delete" in perms, False)

            rows = (
                await db.execute(
                    select(UserSession).where(UserSession.user_id == user.id)
                )
            ).scalars().all()
            check("one session row created", len(rows), 1)
            check("provider recorded", rows[0].auth_provider, "LOCAL")

            print("\n2. The token works")
            check("GET /devices/ with the token", call("GET", "/devices/", token)[0], 200)

            print("\n3. Revoking the session kills the token immediately")
            from modules.authz import service as authz

            await authz.revoke_all_for_user(db, user.id, user.id)
            # No sleep: session state is checked per request and is NOT cached,
            # unlike the permission map.
            check("GET /devices/ after revoke", call("GET", "/devices/", token)[0], 401)
            check("GET /auth/me after revoke", call("GET", "/auth/me", token)[0], 401)

            print("\n4. Signing in again works and issues a fresh session")
            status, payload = call(
                "POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD}
            )
            check("POST /auth/login again", status, 200)
            token2 = (payload or {}).get("access_token")
            check("new token works", call("GET", "/devices/", token2)[0], 200)
            check("old token still dead", call("GET", "/devices/", token)[0], 401)

            print("\n5. Clerk sign-in is revocable too")
            # A real Clerk JWT cannot be minted here, so this exercises the seam
            # that was broken: Clerk used to call create_access_token directly,
            # which produces a token with no `jti` — and _assert_session_active
            # waves those straight through. Every Clerk sign-in was unrevocable
            # for its full lifetime and invisible in the session list.
            from modules.auth.service import issue_session

            clerk_token = await issue_session(db, user, provider="CLERK")
            check("clerk token works", call("GET", "/devices/", clerk_token)[0], 200)
            clerk_rows = (
                await db.execute(
                    select(UserSession).where(
                        UserSession.user_id == user.id,
                        UserSession.auth_provider == "CLERK",
                    )
                )
            ).scalars().all()
            check("a CLERK session row exists to revoke", len(clerk_rows), 1)

            await authz.revoke_all_for_user(db, user.id, user.id)
            check("clerk token dies on revoke", call("GET", "/devices/", clerk_token)[0], 401)

            print("\n6. A token minted without a session cannot be revoked at all")
            # This is the property that made the Clerk bug dangerous, asserted
            # rather than described: nothing here can kill such a token.
            from core.security import create_access_token

            orphan = create_access_token(user.id, user.role)
            check("orphan token is accepted", call("GET", "/devices/", orphan)[0], 200)
            await authz.revoke_all_for_user(db, user.id, user.id)
            check(
                "orphan token SURVIVES revoke — why every path must use issue_session",
                call("GET", "/devices/", orphan)[0],
                200,
            )

        finally:
            await db.execute(delete(UserSession).where(UserSession.user_id == user.id))
            await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
            await db.execute(delete(User).where(User.id == user.id))
            await db.commit()
            left = (
                await db.execute(select(User).where(User.email == EMAIL))
            ).scalars().all()
            check("probe user cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
