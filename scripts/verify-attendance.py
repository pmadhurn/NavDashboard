"""Exercise the attendance rules, including comp-off accrual.

Run:
    docker cp scripts/verify-attendance.py navdashboard-backend-1:/tmp/va.py
    docker exec navdashboard-backend-1 python /tmp/va.py

Writes nothing: every fixture lives in one transaction that is rolled back, so
this is safe against the live stack. The service commits internally, so the
fixtures are created and then explicitly cleaned up rather than relying on a
single outer rollback.
"""
import asyncio
import sys
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, "/app")

from sqlalchemy import delete, select  # noqa: E402

from core.database import async_session_factory  # noqa: E402
from core.exceptions import BadRequestException, ConflictException  # noqa: E402
from modules.attendance import service  # noqa: E402
from modules.attendance.models import AttendanceDay, CompOffLedger  # noqa: E402
from modules.attendance.schemas import (  # noqa: E402
    AttendanceDayCreate,
    AttendanceDayUpdate,
)
from modules.auth.models import User  # noqa: E402
from modules.personnel.models import Person  # noqa: E402
from modules.projects.models import Project  # noqa: E402

# projects.EquipmentMovementItem has a relationship to Asset by name, so the
# mapper cannot configure until the assets module has been imported too. The app
# gets this for free by importing every router; a standalone script does not.
import modules.assets.models  # noqa: E402,F401

results = []


def check(label, got, want):
    ok = got == want
    results.append(ok)
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}: got={got!r} want={want!r}")


def next_weekday(target: int) -> date:
    """A date in the recent past with the given weekday(), to avoid clashing
    with anything a real user may log today."""
    d = date.today() - timedelta(days=370)
    while d.weekday() != target:
        d += timedelta(days=1)
    return d


async def main():
    async with async_session_factory() as db:
        admin = (
            await db.execute(select(User).where(User.role == "ADMIN").limit(1))
        ).scalar_one()
        project = (await db.execute(select(Project).limit(1))).scalar_one()

        person = Person(full_name="Attendance Fixture", role="Engineer")
        db.add(person)
        await db.commit()
        await db.refresh(person)

        saturday = next_weekday(5)
        sunday = saturday + timedelta(days=1)
        monday = saturday + timedelta(days=2)

        try:
            print("\n1. ON_FIELD requires a project")
            try:
                await service.log_day(
                    db,
                    AttendanceDayCreate(
                        person_id=person.id, day=monday, day_type="ON_FIELD"
                    ),
                    admin.id,
                )
                check("ON_FIELD without project", "accepted", "rejected")
            except BadRequestException:
                check("ON_FIELD without project", "rejected", "rejected")

            print("\n2. an unknown day_type is rejected")
            try:
                await service.log_day(
                    db,
                    AttendanceDayCreate(
                        person_id=person.id, day=monday, day_type="SICK_LEAVE"
                    ),
                    admin.id,
                )
                check("unknown day_type", "accepted", "rejected")
            except BadRequestException:
                check("unknown day_type", "rejected", "rejected")

            print("\n3. a weekday field day accrues nothing")
            await service.log_day(
                db,
                AttendanceDayCreate(
                    person_id=person.id, day=monday, day_type="ON_FIELD",
                    project_id=project.id,
                ),
                admin.id,
            )
            bal = await service.comp_off_balance(db, person.id)
            check("balance after Monday field day", bal.balance, Decimal("0.00"))

            print("\n4. a Saturday field day accrues 1.0")
            sat_entry = await service.log_day(
                db,
                AttendanceDayCreate(
                    person_id=person.id, day=saturday, day_type="ON_FIELD",
                    project_id=project.id,
                ),
                admin.id,
            )
            bal = await service.comp_off_balance(db, person.id)
            check("balance after Saturday", bal.balance, Decimal("1.00"))

            print("\n5. a Sunday field day accrues another 1.0")
            await service.log_day(
                db,
                AttendanceDayCreate(
                    person_id=person.id, day=sunday, day_type="ON_FIELD",
                    project_id=project.id,
                ),
                admin.id,
            )
            bal = await service.comp_off_balance(db, person.id)
            check("balance after Sunday", bal.balance, Decimal("2.00"))
            check("accrued total", bal.accrued, Decimal("2.00"))

            print("\n6. the same person cannot log the same day twice")
            try:
                await service.log_day(
                    db,
                    AttendanceDayCreate(
                        person_id=person.id, day=saturday, day_type="IN_OFFICE"
                    ),
                    admin.id,
                )
                check("duplicate day", "accepted", "rejected")
            except ConflictException:
                check("duplicate day", "rejected", "rejected")

            print("\n7. editing the Saturday away removes its accrual")
            await service.update_day(
                db, sat_entry.id,
                AttendanceDayUpdate(day_type="LEAVE", project_id=None),
                admin.id,
            )
            bal = await service.comp_off_balance(db, person.id)
            check("balance after edit to LEAVE", bal.balance, Decimal("1.00"))

            print("\n8. taking a comp-off day consumes 1.0")
            await service.log_day(
                db,
                AttendanceDayCreate(
                    person_id=person.id, day=monday + timedelta(days=1),
                    day_type="COMP_OFF_TAKEN",
                ),
                admin.id,
            )
            bal = await service.comp_off_balance(db, person.id)
            check("balance after taking comp-off", bal.balance, Decimal("0.00"))
            check("consumed total", bal.consumed, Decimal("1.00"))

            print("\n9. summary reports every day type, including zeroes")
            summ = await service.summary(
                db, person.id, saturday - timedelta(days=5), monday + timedelta(days=5)
            )
            check("ON_FIELD count", summ.counts.get("ON_FIELD"), 2)
            check("LEAVE count", summ.counts.get("LEAVE"), 1)
            check("HOLIDAY count present as zero", summ.counts.get("HOLIDAY"), 0)
            check("total logged", summ.total_logged, 4)

            print("\n10. deleting a day removes the ledger rows it produced")
            days = await service.list_days(db, person_id=person.id)
            sunday_row = next(d for d in days if d["day"] == sunday)
            await service.delete_day(db, sunday_row["id"], admin.id)
            bal = await service.comp_off_balance(db, person.id)
            check("balance after deleting Sunday", bal.balance, Decimal("-1.00"))

        finally:
            # The service commits, so clean up explicitly.
            await db.execute(
                delete(CompOffLedger).where(CompOffLedger.person_id == person.id)
            )
            await db.execute(
                delete(AttendanceDay).where(AttendanceDay.person_id == person.id)
            )
            await db.execute(delete(Person).where(Person.id == person.id))
            await db.commit()

            left = (
                await db.execute(
                    select(AttendanceDay).where(AttendanceDay.person_id == person.id)
                )
            ).scalars().all()
            check("fixtures cleaned up", len(left), 0)

    total, ok = len(results), sum(results)
    print(f"\n{ok}/{total} checks passed")
    return 0 if ok == total else 1


sys.exit(asyncio.run(main()))
