"""Tasks are derived, so doing the work makes them disappear.

Run:
    docker cp scripts/verify-tasks.py navdashboard-backend-1:/tmp/vt.py
    docker exec navdashboard-backend-1 python /tmp/vt.py

Self-cleaning. Proves the property that matters: nothing has to remember to
delete a task, because there is nothing to delete.
"""
import asyncio
import sys
from datetime import date

sys.path.insert(0, "/app")

from sqlalchemy import delete, select, text  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from modules.assets.custody_models import AssetMovement, StockLocation  # noqa: E402
from modules.assets.models import Asset  # noqa: E402
from modules.assets.movement_models import AssetHandover, AssetHandoverItem  # noqa: E402
from modules.attendance.models import AttendanceDay  # noqa: E402
from modules.auth.models import User  # noqa: E402
from modules.personnel.models import Person  # noqa: E402
from modules.tasks import service as tasks  # noqa: E402
import modules.projects.models  # noqa: E402,F401

EMAIL = "task-probe@example.invalid"
PNAME = "Task Probe"
CODE = "TESTTASK-0001"
results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got={got!r} want={want!r}")


def keys(ts):
    return sorted(t["key"] for t in ts)


async def _purge(db):
    uids = (await db.execute(select(User.id).where(User.email == EMAIL))).scalars().all()
    pids = (await db.execute(select(Person.id).where(Person.full_name == PNAME))).scalars().all()
    aids = (await db.execute(select(Asset.id).where(Asset.asset_code == CODE))).scalars().all()
    if pids:
        await db.execute(delete(AttendanceDay).where(AttendanceDay.person_id.in_(pids)))
        hids = (await db.execute(select(AssetHandover.id).where(
            AssetHandover.to_person_id.in_(pids) | AssetHandover.from_person_id.in_(pids)))).scalars().all()
        if hids:
            await db.execute(delete(AssetHandoverItem).where(AssetHandoverItem.handover_id.in_(hids)))
            await db.execute(delete(AssetHandover).where(AssetHandover.id.in_(hids)))
    if aids:
        await db.execute(delete(AssetMovement).where(AssetMovement.asset_id.in_(aids)))
        await db.execute(delete(Asset).where(Asset.id.in_(aids)))
    if pids:
        await db.execute(delete(Person).where(Person.id.in_(pids)))
    if uids:
        await db.execute(text("DELETE FROM user_sessions WHERE user_id = ANY(:i)"), {"i": uids})
        await db.execute(delete(User).where(User.id.in_(uids)))
    await db.commit()


async def main():
    async with async_session_factory() as db:
        await _purge(db)
        office = (await db.execute(select(StockLocation).where(StockLocation.name == "Office"))).scalar_one()

        user = User(email=EMAIL, username="task_probe", hashed_password="x",
                    full_name=PNAME, role="TECHNICIAN", is_active=True, status="ACTIVE")
        db.add(user); await db.commit(); await db.refresh(user)
        person = Person(full_name=PNAME, role="Engineer", user_id=user.id)
        db.add(person); await db.commit(); await db.refresh(person)

        try:
            print("\n1. A fresh person owes their attendance")
            t = await tasks.my_tasks(db, user)
            check("attendance asked for", "attendance.today" in keys(t), True)
            check("no project update asked (not on a project)", "update.today" in keys(t), False)
            check("no equipment task (holding nothing)", any(k.startswith("equipment") for k in keys(t)), False)

            print("\n2. Logging attendance removes the task — nothing deletes it")
            db.add(AttendanceDay(person_id=person.id, day=date.today(),
                                 day_type="IN_OFFICE", logged_by=user.id))
            await db.commit()
            t = await tasks.my_tasks(db, user)
            check("attendance task gone", "attendance.today" in keys(t), False)

            print("\n3. Holding equipment shows up, and is not urgent")
            asset = Asset(asset_code=CODE, name="Task Probe Item",
                          custody_type="PERSON", custody_id=person.id, condition="OK")
            db.add(asset); await db.commit(); await db.refresh(asset)
            t = await tasks.my_tasks(db, user)
            held = next((x for x in t if x["key"] == "equipment.held"), None)
            check("holding shown", held is not None, True)
            check("count is right", held and held["count"], 1)
            check("not urgent", held and held["urgency"], "SOON")

            print("\n4. Overdue replaces it and blocks")
            asset.expected_return_date = date(2020, 1, 1)
            await db.commit()
            t = await tasks.my_tasks(db, user)
            check("overdue shown", "equipment.overdue" in keys(t), True)
            check("plain holding no longer shown", "equipment.held" in keys(t), False)
            check("blocking", next(x for x in t if x["key"] == "equipment.overdue")["urgency"], "BLOCKING")

            print("\n5. A handover awaiting you blocks, and sorts first")
            other = (await db.execute(select(Person).where(
                Person.id != person.id, Person.deleted_at.is_(None)).limit(1))).scalar_one()
            h = AssetHandover(from_person_id=other.id, to_person_id=person.id,
                              status="PENDING", initiated_by=user.id)
            db.add(h); await db.flush()
            db.add(AssetHandoverItem(handover_id=h.id, asset_id=asset.id))
            await db.commit()
            t = await tasks.my_tasks(db, user)
            check("handover shown", "handover.accept" in keys(t), True)
            check("blocking sorts to the top", t[0]["urgency"], "BLOCKING")

            print("\n6. Every task carries a link you can act from")
            check("all have links", all(x["link"] for x in t), True)
            check("all have an action label", all(x["action"] for x in t), True)

            print("\n7. Notifications are stored, and can be cleared")
            await tasks.notify(db, user_id=user.id, kind="TEST", title="Probe note",
                               link="/", created_by=user.id)
            unread = await tasks.list_notifications(db, user, unread_only=True)
            check("one unread", len(unread), 1)
            marked = await tasks.mark_read(db, user, None)
            check("marked read", marked, 1)
            check("none unread now", len(await tasks.list_notifications(db, user, unread_only=True)), 0)
            await db.execute(text("DELETE FROM notifications WHERE user_id = :u"), {"u": user.id})
            await db.commit()

        finally:
            await _purge(db)
            left = (await db.execute(select(User).where(User.email == EMAIL))).scalars().all()
            check("fixtures cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
