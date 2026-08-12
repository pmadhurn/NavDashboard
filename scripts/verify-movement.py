"""Handover with explicit accept, and the 10-out-7-back problem.

Run:
    docker cp scripts/verify-movement.py navdashboard-backend-1:/tmp/vm.py
    docker exec navdashboard-backend-1 python /tmp/vm.py

Self-cleaning: purges its fixtures on start and in a finally block.
"""
import asyncio
import sys

sys.path.insert(0, "/app")

from sqlalchemy import delete, select, text  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.exceptions import ConflictException, BadRequestException  # noqa: E402
from modules.assets import custody_service as cs, movement_service as ms  # noqa: E402
from modules.assets.custody_models import AssetMovement, Customer, StockLocation  # noqa: E402
from modules.assets.models import Asset  # noqa: E402
from modules.assets.movement_models import (  # noqa: E402
    AssetBundle, AssetBundleItem, AssetHandover, AssetHandoverItem, AssetRepair,
)
from modules.auth.models import User  # noqa: E402
from modules.personnel.models import Person  # noqa: E402
from modules.projects.models import Project  # noqa: E402
from modules.tasks.models import Notification  # noqa: E402

PREFIX = "TESTMOVE-"
P1, P2 = "Move Probe A", "Move Probe B"
results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got={got!r} want={want!r}")


async def expect_raises(label, coro, exc):
    try:
        await coro
        check(label, "accepted", "rejected")
    except exc:
        check(label, "rejected", "rejected")


async def _purge(db):
    ids = (await db.execute(select(Asset.id).where(Asset.asset_code.like(PREFIX + "%")))).scalars().all()
    if ids:
        for tbl in (AssetHandoverItem, AssetBundleItem, AssetRepair, AssetMovement):
            await db.execute(delete(tbl).where(tbl.asset_id.in_(ids)))
        await db.execute(delete(Asset).where(Asset.id.in_(ids)))
    pids = (await db.execute(select(Person.id).where(Person.full_name.in_([P1, P2])))).scalars().all()
    if pids:
        hids = (await db.execute(select(AssetHandover.id).where(
            AssetHandover.from_person_id.in_(pids) | AssetHandover.to_person_id.in_(pids)
        ))).scalars().all()
        if hids:
            # Notifications outlive the handover they point at, and they hang off
            # users rather than persons, so deleting the fixture people does not
            # take them with it.
            await db.execute(delete(Notification).where(
                Notification.entity_type == "asset_handover",
                Notification.entity_id.in_(hids),
            ))
            await db.execute(delete(AssetHandoverItem).where(
                AssetHandoverItem.handover_id.in_(hids)))
            await db.execute(delete(AssetHandover).where(AssetHandover.id.in_(hids)))
        await db.execute(delete(Person).where(Person.id.in_(pids)))
    await db.execute(text("DELETE FROM asset_bundles WHERE name = 'Test Kit (verify)'"))
    await db.execute(text("DELETE FROM customers WHERE name = 'Move Probe Customer'"))
    await db.commit()


async def main():
    async with async_session_factory() as db:
        await _purge(db)
        admin = (await db.execute(select(User).where(User.role == "ADMIN").limit(1))).scalar_one()
        office = (await db.execute(select(StockLocation).where(StockLocation.name == "Office"))).scalar_one()
        project = (await db.execute(select(Project).where(Project.deleted_at.is_(None)).limit(1))).scalar_one()

        a = Person(full_name=P1, role="Engineer"); b = Person(full_name=P2, role="Engineer")
        cust = Customer(name="Move Probe Customer")
        db.add_all([a, b, cust]); await db.commit()
        await db.refresh(a); await db.refresh(b); await db.refresh(cust)

        assets = []
        for i in range(1, 11):
            x = Asset(asset_code=f"{PREFIX}{i:04d}", name=f"Probe Item {i}",
                      custody_type="LOCATION", custody_id=office.id, condition="OK")
            db.add(x); assets.append(x)
        await db.commit()
        for x in assets:
            await db.refresh(x)

        try:
            print("\n1. Issue 10 items to engineer A")
            for x in assets:
                await ms.resolve_item(db, asset_id=x.id, outcome="RETURNED", user_id=admin.id, commit=False)
            await db.commit()
            for x in assets:
                await cs.move_custody(db, x, to_custody_type="PERSON", to_custody_id=a.id,
                                      event_type="ISSUED", user_id=admin.id, commit=False)
            await db.commit()
            check("all 10 with A", sum(1 for x in assets if x.custody_type == "PERSON"), 10)

            print("\n2. Handover does NOT move custody until accepted")
            h = await ms.create_handover(db, from_person_id=a.id, to_person_id=b.id,
                                         asset_ids=[assets[0].id, assets[1].id],
                                         note="Going on leave", user_id=admin.id)
            check("status", h.status, "PENDING")
            await db.refresh(assets[0])
            check("still with A", str(assets[0].custody_id), str(a.id))

            print("\n3. The same item cannot be promised twice")
            await expect_raises("double-offer", ms.create_handover(
                db, from_person_id=a.id, to_person_id=b.id,
                asset_ids=[assets[0].id], note=None, user_id=admin.id), ConflictException)

            print("\n4. You cannot hand on what you are not holding")
            await expect_raises("not held", ms.create_handover(
                db, from_person_id=b.id, to_person_id=a.id,
                asset_ids=[assets[5].id], note=None, user_id=admin.id), ConflictException)

            print("\n5. Accepting moves custody, and the chain is recorded")
            await ms.respond_to_handover(db, h.id, accept=True, note="Got them", user_id=admin.id)
            await db.refresh(assets[0])
            check("now with B", str(assets[0].custody_id), str(b.id))
            hist = await cs.list_movements(db, assets[0].id)
            check("handover in the timeline", hist[0]["event_type"], "HANDED_OVER")
            check("chain: A -> B", (hist[0]["from_label"], hist[0]["to_label"]), (P1, P2))

            print("\n6. Responding twice is refused")
            await expect_raises("respond twice", ms.respond_to_handover(
                db, h.id, accept=False, note=None, user_id=admin.id), ConflictException)

            print("\n7. Rejecting leaves custody where it was")
            h2 = await ms.create_handover(db, from_person_id=a.id, to_person_id=b.id,
                                          asset_ids=[assets[2].id], note=None, user_id=admin.id)
            await ms.respond_to_handover(db, h2.id, accept=False, note="On leave myself", user_id=admin.id)
            await db.refresh(assets[2])
            check("still with A after rejection", str(assets[2].custody_id), str(a.id))

            print("\n8. 10 out, 7 back — nothing is 'missing'")
            # 7 returned, 1 left at site, 1 to the customer, 1 damaged
            for x in assets[3:10]:
                await ms.resolve_item(db, asset_id=x.id, outcome="RETURNED",
                                      user_id=admin.id, commit=False)
            await ms.resolve_item(db, asset_id=assets[0].id, outcome="LEFT_AT_SITE",
                                  project_id=project.id, note="Testing ongoing",
                                  user_id=admin.id, commit=False)
            await ms.resolve_item(db, asset_id=assets[1].id, outcome="HANDED_TO_CUSTOMER",
                                  customer_id=cust.id, note="Goodwill", user_id=admin.id, commit=False)
            await ms.resolve_item(db, asset_id=assets[2].id, outcome="DAMAGED",
                                  note="Dropped", user_id=admin.id, commit=False)
            await db.commit()
            for x in assets:
                await db.refresh(x)
            check("returned to stock", sum(1 for x in assets if x.custody_type == "LOCATION" and x.condition == "OK"), 7)
            check("left at the project", sum(1 for x in assets if x.custody_type == "PROJECT"), 1)
            check("with the customer", sum(1 for x in assets if x.custody_type == "CUSTOMER"), 1)
            check("damaged, in stock", sum(1 for x in assets if x.condition == "DAMAGED"), 1)
            check("nothing unaccounted for", sum(1 for x in assets if x.custody_type == "UNKNOWN"), 0)

            print("\n9. LEFT_AT_SITE without a project is refused")
            await expect_raises("left at site, no project", ms.resolve_item(
                db, asset_id=assets[3].id, outcome="LEFT_AT_SITE", user_id=admin.id),
                BadRequestException)

            print("\n10. Repair: report -> send -> back in service")
            rep = await ms.report_damage(db, asset_id=assets[4].id, details="Cracked casing",
                                         damage_location="Siliguri site",
                                         responsible_person_id=a.id, project_id=project.id,
                                         damaged_at=None, user_id=admin.id)
            await db.refresh(assets[4])
            check("condition after report", assets[4].condition, "DAMAGED")
            await ms.send_for_repair(db, rep.id, vendor_id=None, cost=1500, note="Local shop", user_id=admin.id)
            await db.refresh(assets[4])
            check("condition when sent", assets[4].condition, "UNDER_REPAIR")
            await ms.complete_repair(db, rep.id, repaired=True, cost=1800, note="Fixed",
                                     return_location_id=office.id, user_id=admin.id)
            await db.refresh(assets[4])
            check("condition after repair", assets[4].condition, "OK")
            check("available again", cs.is_available(assets[4]), True)

            print("\n11. Irreparable retires the item without deleting it")
            rep2 = await ms.report_damage(db, asset_id=assets[5].id, details="Burnt out",
                                          damage_location=None, responsible_person_id=None,
                                          project_id=None, damaged_at=None, user_id=admin.id)
            await ms.complete_repair(db, rep2.id, repaired=False, cost=None,
                                     note="Beyond repair", return_location_id=None, user_id=admin.id)
            await db.refresh(assets[5])
            check("retired", assets[5].condition, "RETIRED")
            check("still on the books", (await db.execute(
                select(Asset).where(Asset.id == assets[5].id))).scalar_one_or_none() is not None, True)

            print("\n12. Kits expand to individually-tracked items")
            bundle = await ms.create_bundle(db, name="Test Kit (verify)", description="Probe kit",
                                            asset_ids=[assets[6].id, assets[7].id], user_id=admin.id)
            kits = await ms.list_bundles(db)
            kit = next(k for k in kits if k["id"] == bundle.id)
            check("kit item count", len(kit["items"]), 2)
            check("availability shown per item", all("available" in i for i in kit["items"]), True)
            await ms.delete_bundle(db, bundle.id, admin.id)
            await db.refresh(assets[6])
            check("deleting a kit keeps its items", assets[6].deleted_at, None)

            print("\n13. A handover tells the other person, and survives them having no login")

            async def notes_for(user_id, kind=None):
                stmt = select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.entity_type == "asset_handover",
                )
                if kind:
                    stmt = stmt.where(Notification.kind == kind)
                return list((await db.execute(stmt)).scalars().all())

            # B has a login; A deliberately does not — that is the common state
            # before someone links every personnel record to an account.
            b.user_id = admin.id
            await db.commit()
            check("A has no login (the case that used to crash)", a.user_id, None)

            spare = assets[8]
            await cs.move_custody(db, spare, to_custody_type="PERSON", to_custody_id=a.id,
                                  event_type="ISSUED", user_id=admin.id)
            before = len(await notes_for(admin.id))

            h3 = await ms.create_handover(db, from_person_id=a.id, to_person_id=b.id,
                                          asset_ids=[spare.id], note="Site swap", user_id=admin.id)
            offered = await notes_for(admin.id, "handover.offered")
            check("the receiver is told", len(await notes_for(admin.id)) - before, 1)
            check("it points at this handover", str(offered[-1].entity_id), str(h3.id))
            check("it names who is offering", P1 in offered[-1].title, True)
            check("it names the item, not just a count", spare.asset_code in (offered[-1].body or ""), True)
            check("it links somewhere useful", offered[-1].link, "/inventory/handovers")
            check("it arrives unread", offered[-1].read_at, None)

            # Accepting notifies the *offerer* — who has no login here. The
            # handover must still go through; nobody simply gets told.
            before = len(await notes_for(admin.id))
            await ms.respond_to_handover(db, h3.id, accept=True, note=None, user_id=admin.id)
            await db.refresh(spare)
            check("accepted despite an unlinked offerer", str(spare.custody_id), str(b.id))
            check("nothing invented for a person with no login",
                  len(await notes_for(admin.id)) - before, 0)

            # And the other direction: B offers, A declines, B hears about it.
            h4 = await ms.create_handover(db, from_person_id=b.id, to_person_id=a.id,
                                          asset_ids=[spare.id], note=None, user_id=admin.id)
            await ms.respond_to_handover(db, h4.id, accept=False, note="Not my site", user_id=admin.id)
            declined = await notes_for(admin.id, "handover.declined")
            check("a decline reaches the person left holding it", len(declined), 1)
            check("and says so", "still with you" in declined[-1].title, True)

            # Withdrawing an offer has to reach the person who was asked to
            # accept it — it is sitting in their task list until it does.
            await cs.move_custody(db, spare, to_custody_type="PERSON", to_custody_id=a.id,
                                  event_type="ISSUED", user_id=admin.id)
            h5 = await ms.create_handover(db, from_person_id=a.id, to_person_id=b.id,
                                          asset_ids=[spare.id], note=None, user_id=admin.id)
            await ms.cancel_handover(db, h5.id, admin.id)
            check("withdrawing tells whoever was asked",
                  len(await notes_for(admin.id, "handover.cancelled")), 1)

        finally:
            await _purge(db)
            left = (await db.execute(select(Asset).where(Asset.asset_code.like(PREFIX + "%")))).scalars().all()
            check("fixtures cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
