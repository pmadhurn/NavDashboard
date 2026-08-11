"""Prove the scope dimension enforces, for a NON-admin user.

Run:
    docker cp scripts/verify-scope.py navdashboard-backend-1:/tmp/verify-scope.py
    docker exec navdashboard-backend-1 python /tmp/verify-scope.py

Unlike scripts/*.sh, this writes nothing: every fixture lives in one
transaction that is rolled back. Safe to run against the live stack.

Everything happens inside one transaction that is rolled back at the end, so the
production database is unchanged. ADMIN cannot test this at all: full_scope_map()
returns ALL for every section, so an admin passes every check by construction.
"""
import asyncio
import sys

sys.path.insert(0, "/app")

from sqlalchemy import select  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.dependencies import assert_scope, get_scope_map  # noqa: E402
from core.exceptions import ForbiddenException  # noqa: E402
from modules.auth.models import User, UserScope  # noqa: E402
from modules.personnel.models import Person  # noqa: E402

PASS, FAIL = "PASS", "FAIL"
results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{PASS if ok else FAIL}] {label}: got={got!r} want={want!r}")


async def expect_forbidden(label, coro):
    try:
        await coro
    except ForbiddenException:
        check(label, "403", "403")
        return
    check(label, "allowed", "403")


async def expect_allowed(label, coro):
    try:
        await coro
    except ForbiddenException as e:
        check(label, f"403 ({e})", "allowed")
        return
    check(label, "allowed", "allowed")


async def main():
    async with async_session_factory() as db:
        # --- fixtures, all rolled back -------------------------------------
        tech = User(
            email="scopetest.tech@example.invalid",
            username="scopetest_tech",
            hashed_password="x",
            full_name="Scope Tech",
            role="TECHNICIAN",
        )
        lead = User(
            email="scopetest.lead@example.invalid",
            username="scopetest_lead",
            hashed_password="x",
            full_name="Scope Lead",
            role="TECHNICIAN",
        )
        db.add_all([tech, lead])
        await db.flush()

        p_lead = Person(full_name="Scope Lead", role="Team Lead", user_id=lead.id)
        db.add(p_lead)
        await db.flush()

        p_tech = Person(
            full_name="Scope Tech", role="Engineer", user_id=tech.id,
            team_lead_id=p_lead.id,
        )
        p_other = Person(full_name="Unrelated Person", role="Engineer")
        db.add_all([p_tech, p_other])
        await db.flush()

        print("\n1. TECHNICIAN with NO explicit rows -> role defaults")
        smap = await get_scope_map(db, tech)
        check("attendance scope", smap.get("attendance"), "SELF")
        check("updates scope", smap.get("updates"), "SELF")
        # Absent from the map entirely, which assert_scope reads as ALL.
        check("devices not narrowed", smap.get("devices"), None)

        print("\n2. scope=SELF reaches only the caller")
        await expect_allowed(
            "own attendance", assert_scope(db, tech, "attendance", p_tech.id)
        )
        await expect_forbidden(
            "teammate's attendance", assert_scope(db, tech, "attendance", p_other.id)
        )
        await expect_forbidden(
            "lead's attendance", assert_scope(db, tech, "attendance", p_lead.id)
        )

        print("\n3. scope=ALL section is unaffected by the target")
        await expect_allowed(
            "devices, someone else", assert_scope(db, tech, "devices", p_other.id)
        )

        print("\n4. explicit rows override role defaults; TEAM reaches reports")
        db.add_all([
            UserScope(user_id=lead.id, section="attendance", scope="TEAM"),
            UserScope(user_id=lead.id, section="finance", scope="SELF"),
        ])
        await db.flush()
        smap_lead = await get_scope_map(db, lead)
        check("lead attendance scope", smap_lead.get("attendance"), "TEAM")
        await expect_allowed(
            "lead -> own", assert_scope(db, lead, "attendance", p_lead.id)
        )
        await expect_allowed(
            "lead -> direct report", assert_scope(db, lead, "attendance", p_tech.id)
        )
        await expect_forbidden(
            "lead -> unrelated person", assert_scope(db, lead, "attendance", p_other.id)
        )
        await expect_forbidden(
            "lead finance SELF -> report", assert_scope(db, lead, "finance", p_tech.id)
        )

        print("\n5. a login with no personnel record cannot reach anyone")
        orphan = User(
            email="scopetest.orphan@example.invalid",
            username="scopetest_orphan",
            hashed_password="x",
            full_name="Orphan",
            role="TECHNICIAN",
        )
        db.add(orphan)
        await db.flush()
        await expect_forbidden(
            "orphan -> any person", assert_scope(db, orphan, "attendance", p_tech.id)
        )

        print("\n6. ADMIN still bypasses everything")
        admin = (
            await db.execute(select(User).where(User.role == "ADMIN").limit(1))
        ).scalar_one()
        await expect_allowed(
            "admin -> anyone", assert_scope(db, admin, "attendance", p_other.id)
        )

        await db.rollback()
        print("\n(transaction rolled back — no rows persisted)")

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
