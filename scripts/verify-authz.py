"""Prove fine-grained enforcement over real HTTP, as a NON-admin.

Run:
    docker cp scripts/verify-authz.py navdashboard-backend-1:/tmp/va2.py
    docker exec navdashboard-backend-1 python /tmp/va2.py

Creates one throwaway user, exercises it against the running API, and deletes
it again in a finally block. It cannot use a rolled-back transaction the way
verify-scope.py does, because the requests cross a process boundary into the
live server — the rows have to be really there.

It must NOT run as ADMIN: `effective_permissions()` short-circuits to the whole
catalog for the legacy ADMIN role, so an admin passes every check by
construction and would prove nothing.
"""
import asyncio
import sys
import urllib.error
import urllib.request

sys.path.insert(0, "/app")

from sqlalchemy import delete, select, text  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.security import create_access_token  # noqa: E402
from modules.auth.models import Role, User, UserRole  # noqa: E402

BASE = "http://127.0.0.1:8000/api/v1"
PROBE_EMAIL = "authz-probe@example.invalid"

results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got={got} want={want}")


def call(method, path, token):
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if method in ("POST", "PUT"):
        req.add_header("Content-Type", "application/json")
        req.data = b"{}"
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # pragma: no cover
        return f"ERR:{e}"


async def main():
    async with async_session_factory() as db:
        user = User(
            email=PROBE_EMAIL,
            username="authz_probe",
            hashed_password="x",
            full_name="Authz Probe",
            role="VIEWER",          # NOT admin — the whole point
            is_active=True,
            status="ACTIVE",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        token = create_access_token(user.id, "VIEWER")

        try:
            print("\n1. No roles at all -> denied everywhere, but self-service works")
            check("GET /auth/me (AUTHENTICATED)", call("GET", "/auth/me", token), 200)
            check("GET /devices/", call("GET", "/devices/", token), 403)
            check("GET /dashboard/home", call("GET", "/dashboard/home", token), 403)
            # Previously reachable by ANY authenticated user:
            check("GET /reports/templates", call("GET", "/reports/templates", token), 403)
            check("POST /status/change", call("POST", "/status/change", token), 403)
            check("GET /documents/by-entity", call("GET", "/documents/by-entity", token), 403)
            # 403 rather than 422: authorization runs before request validation,
            # so an unauthorized caller learns nothing about the parameter shape.
            check("GET /search/global", call("GET", "/search/global?q=ab", token), 403)
            check("GET /locations/history", call("GET", "/locations/history", token), 403)
            # Creating accounts is an administrative act. This was briefly
            # mapped PUBLIC during the migration, which would have opened
            # self-registration; the check exists so it cannot regress.
            check("POST /auth/register", call("POST", "/auth/register", token), 403)

            print("\n2. Grant the Viewer role -> reads open, writes stay shut")
            viewer = (
                await db.execute(select(Role).where(Role.name == "Viewer"))
            ).scalar_one()
            db.add(UserRole(user_id=user.id, role_id=viewer.id))
            await db.commit()
            # The effective-permission cache is per-process in the API server,
            # so wait it out rather than pretending the grant is instant.
            print("   (waiting out the 30s permission cache)")
            await asyncio.sleep(32)

            check("GET /devices/ (devices.read)", call("GET", "/devices/", token), 200)
            check("GET /dashboard/home (dashboard.read)", call("GET", "/dashboard/home", token), 200)
            check("GET /search/global (search.read)", call("GET", "/search/global?q=ab", token), 200)
            check("POST /devices/ (devices.create, NOT granted)", call("POST", "/devices/", token), 403)
            check("DELETE /devices/{id} (devices.delete)", call("DELETE", "/devices/00000000-0000-0000-0000-000000000000", token), 403)
            check("GET /auth/users (users.read, excluded)", call("GET", "/auth/users", token), 403)
            check("GET /backup/table-counts (excluded)", call("GET", "/backup/table-counts", token), 403)
            check("POST /seeding/run (dangerous, excluded)", call("POST", "/seeding/run", token), 403)
            check("GET /audit/ (excluded)", call("GET", "/audit/", token), 403)

            print("\n3. Public routes need no token at all")
            req = urllib.request.Request(f"{BASE}/health")
            with urllib.request.urlopen(req, timeout=10) as r:
                check("GET /health unauthenticated", r.status, 200)
            check("GET /devices/ with a garbage token", call("GET", "/devices/", "not-a-token"), 401)

        finally:
            await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
            await db.execute(delete(User).where(User.id == user.id))
            await db.commit()
            left = (
                await db.execute(select(User).where(User.email == PROBE_EMAIL))
            ).scalars().all()
            check("probe user cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
