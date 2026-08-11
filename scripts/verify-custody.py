"""Exercise custody, condition and the movement ledger.

Run:
    docker cp scripts/verify-custody.py navdashboard-backend-1:/tmp/vc.py
    docker exec navdashboard-backend-1 python /tmp/vc.py

Creates one throwaway asset, moves it around, and deletes it plus its ledger.
Self-cleans on start, so a failed run never blocks the next.
"""
import asyncio
import sys

sys.path.insert(0, "/app")

from sqlalchemy import delete, select, text  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.exceptions import BadRequestException, ConflictException, NotFoundException  # noqa: E402
from modules.assets import custody_service as cs  # noqa: E402
from modules.assets.custody_models import (  # noqa: E402
    AssetMovement,
    Customer,
    StockLocation,
)
from modules.assets.models import Asset  # noqa: E402
from modules.auth.models import User  # noqa: E402
from modules.personnel.models import Person  # noqa: E402
import modules.projects.models  # noqa: E402,F401  (mapper needs it)

CODE = "TEST-CUSTODY-0001"
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
    ids = (await db.execute(select(Asset.id).where(Asset.asset_code == CODE))).scalars().all()
    if ids:
        await db.execute(delete(AssetMovement).where(AssetMovement.asset_id.in_(ids)))
        await db.execute(delete(Asset).where(Asset.id.in_(ids)))
    await db.execute(text("DELETE FROM customers WHERE name = 'Test Customer (verify)'"))
    await db.commit()


async def main():
    async with async_session_factory() as db:
        await _purge(db)
        admin = (await db.execute(select(User).where(User.role == "ADMIN").limit(1))).scalar_one()
        office = (await db.execute(select(StockLocation).where(StockLocation.name == "Office"))).scalar_one()
        rnd = (await db.execute(select(StockLocation).where(StockLocation.name == "R&D"))).scalar_one()
        person = (await db.execute(select(Person).where(Person.deleted_at.is_(None)).limit(1))).scalar_one()

        asset = Asset(asset_code=CODE, name="Verify Custody Widget",
                      custody_type="LOCATION", custody_id=office.id, condition="OK")
        db.add(asset)
        await db.commit()
        await db.refresh(asset)

        try:
            print("\n1. Starts available in the office")
            check("custody", asset.custody_type, "LOCATION")
            check("is_available", cs.is_available(asset), True)

            print("\n2. Move to R&D — available, and the ledger records both ends")
            await cs.move_custody(db, asset, to_custody_type="LOCATION",
                                  to_custody_id=rnd.id, reason="Bench testing",
                                  user_id=admin.id)
            check("now at R&D", await cs.holder_label(db, asset.custody_type, asset.custody_id), "R&D")
            check("still available", cs.is_available(asset), True)
            hist = await cs.list_movements(db, asset.id)
            check("ledger rows", len(hist), 1)
            check("from label", hist[0]["from_label"], "Office")
            check("to label", hist[0]["to_label"], "R&D")

            print("\n3. Issue to a person — no longer available")
            await cs.move_custody(db, asset, to_custody_type="PERSON",
                                  to_custody_id=person.id, event_type="ISSUED",
                                  reason="Taken to site", user_id=admin.id)
            check("held by person", asset.custody_type, "PERSON")
            check("not available", cs.is_available(asset), False)
            check("legacy status mirrored", asset.status, "WITH_PERSON")

            print("\n4. Damage does NOT move the item")
            before = asset.custody_id
            await cs.set_condition(db, asset, condition="DAMAGED",
                                   reason="Dropped on site", user_id=admin.id)
            check("condition", asset.condition, "DAMAGED")
            check("custody unchanged", asset.custody_id, before)
            check("not available while damaged", cs.is_available(asset), False)

            print("\n5. Back in the office but still damaged -> still not available")
            await cs.move_custody(db, asset, to_custody_type="LOCATION",
                                  to_custody_id=office.id, event_type="RETURNED",
                                  reason="Returned from site", user_id=admin.id)
            check("in a location", asset.custody_type, "LOCATION")
            check("condition survives the move", asset.condition, "DAMAGED")
            check("still not available", cs.is_available(asset), False)

            print("\n6. Repaired -> available again")
            await cs.set_condition(db, asset, condition="OK",
                                   reason="Repaired in-house", user_id=admin.id)
            check("available again", cs.is_available(asset), True)

            print("\n7. Handed to a customer — kept, not deleted")
            cust = Customer(name="Test Customer (verify)")
            db.add(cust)
            await db.commit()
            await cs.move_custody(db, asset, to_custody_type="CUSTOMER",
                                  to_custody_id=cust.id, event_type="GIVEN_TO_CUSTOMER",
                                  reason="Goodwill", user_id=admin.id)
            check("held by customer", asset.custody_type, "CUSTOMER")
            check("still in inventory", (await db.execute(
                select(Asset).where(Asset.id == asset.id))).scalar_one_or_none() is not None, True)

            print("\n8. The whole history is there, newest first")
            hist = await cs.list_movements(db, asset.id)
            check("ledger rows", len(hist), 6)
            check("newest is the customer handover", hist[0]["event_type"], "GIVEN_TO_CUSTOMER")

            print("\n9. Bad input is refused")
            await expect_raises("unknown custody_type",
                                cs.move_custody(db, asset, to_custody_type="SOMEWHERE"),
                                BadRequestException)
            await expect_raises("missing custody_id",
                                cs.move_custody(db, asset, to_custody_type="PERSON"),
                                BadRequestException)
            await expect_raises("nonexistent holder",
                                cs.move_custody(db, asset, to_custody_type="PERSON",
                                                to_custody_id=admin.id),
                                NotFoundException)
            await expect_raises("bad condition",
                                cs.set_condition(db, asset, condition="SLIGHTLY_BENT"),
                                BadRequestException)

            print("\n10. A location still holding stock cannot be deleted")
            await cs.move_custody(db, asset, to_custody_type="LOCATION",
                                  to_custody_id=rnd.id, user_id=admin.id)
            await expect_raises("delete occupied location",
                                cs.delete_location(db, rnd.id, admin.id),
                                ConflictException)

        finally:
            await _purge(db)
            left = (await db.execute(select(Asset).where(Asset.asset_code == CODE))).scalars().all()
            check("fixtures cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
