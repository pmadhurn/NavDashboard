"""One home screen per role, each answering that role's one question.

An Inventory Manager and a rigger open the same app to do entirely different
jobs. Showing them the same numbers means at least one of them is reading a
page built for somebody else.

The role is inferred from what the person can actually DO, not from a label:
someone granted the inventory keys gets the inventory home whether or not
anybody remembered to call them an Inventory Manager.
"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Which home to show, most specific first. Leadership beats inventory because
# someone with both is looking at the whole company, not the store cupboard.
HOME_RULES = [
    ("leadership", "leadership.read"),
    ("inventory", "assets.custody"),
    ("finance", "finance.settle"),
    ("rnd", "troubleshooting.resolve"),
]


async def resolve_home(db: AsyncSession, user) -> str:
    """Which home screen this person should land on."""
    from core.authz import effective_permissions

    granted = await effective_permissions(db, user)
    for home, key in HOME_RULES:
        if key in granted:
            return home
    # Everyone else is here to do their own work.
    return "me"


async def inventory_home(db: AsyncSession) -> dict:
    """What the person responsible for the physical items needs to see."""
    from modules.assets import custody_service
    from modules.assets.models import Asset
    from modules.assets.movement_models import AssetHandover, AssetRepair

    summary = await custody_service.custody_summary(db)

    pending_handovers = (
        await db.execute(
            select(func.count())
            .select_from(AssetHandover)
            .where(AssetHandover.status == "PENDING", AssetHandover.deleted_at.is_(None))
        )
    ).scalar_one()

    open_repairs = (
        await db.execute(
            select(func.count())
            .select_from(AssetRepair)
            .where(
                AssetRepair.status.in_(("REPORTED", "SENT")),
                AssetRepair.deleted_at.is_(None),
            )
        )
    ).scalar_one()

    with_people = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(Asset.custody_type == "PERSON", Asset.deleted_at.is_(None))
        )
    ).scalar_one()

    at_customers = (
        await db.execute(
            select(func.count())
            .select_from(Asset)
            .where(Asset.custody_type == "CUSTOMER", Asset.deleted_at.is_(None))
        )
    ).scalar_one()

    return {
        **summary,
        "with_people": with_people,
        "at_customers": at_customers,
        "pending_handovers": pending_handovers,
        "open_repairs": open_repairs,
    }


async def finance_home(db: AsyncSession) -> dict:
    from modules.finance.models import Expense, ExpenseClaim, FundAllocation

    month_start = date.today().replace(day=1)

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar_one_or_none() or 0

    spend_month = await scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.expense_date >= month_start, Expense.deleted_at.is_(None)
        )
    )
    advanced = await scalar(
        select(func.coalesce(func.sum(FundAllocation.amount), 0)).where(
            FundAllocation.deleted_at.is_(None)
        )
    )
    spent_total = await scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.deleted_at.is_(None)
        )
    )
    pending_claims = await scalar(
        select(func.count())
        .select_from(ExpenseClaim)
        .where(ExpenseClaim.status != "SETTLED", ExpenseClaim.deleted_at.is_(None))
    )
    unreceipted = await scalar(
        select(func.count())
        .select_from(Expense)
        .where(Expense.status == "SUBMITTED", Expense.deleted_at.is_(None))
    )

    return {
        "spend_this_month": float(spend_month),
        "advanced_total": float(advanced),
        "spent_total": float(spent_total),
        # Negative means people are owed money — the number Finance actually
        # chases, so it is stated rather than left to be worked out.
        "outstanding": float(advanced) - float(spent_total),
        "pending_claims": pending_claims,
        "awaiting_review": unreceipted,
    }


async def rnd_home(db: AsyncSession) -> dict:
    from modules.assets.models import Asset
    from modules.devices.models import Device
    from modules.troubleshooting.models import ErrorLog

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar_one_or_none() or 0

    open_errors = await scalar(
        select(func.count())
        .select_from(ErrorLog)
        .where(ErrorLog.resolved.is_(False), ErrorLog.deleted_at.is_(None))
    )
    critical = await scalar(
        select(func.count())
        .select_from(ErrorLog)
        .where(
            ErrorLog.resolved.is_(False),
            ErrorLog.severity == "CRITICAL",
            ErrorLog.deleted_at.is_(None),
        )
    )
    device_rows = (
        await db.execute(
            select(Device.status, func.count())
            .where(Device.deleted_at.is_(None))
            .group_by(Device.status)
        )
    ).all()
    devices = {s: c for s, c in device_rows}
    damaged = await scalar(
        select(func.count())
        .select_from(Asset)
        .where(
            Asset.condition.in_(("DAMAGED", "UNDER_REPAIR")),
            Asset.deleted_at.is_(None),
        )
    )

    return {
        "open_errors": open_errors,
        "critical_errors": critical,
        "devices_total": sum(devices.values()),
        "devices_working": devices.get("WORKING", 0),
        "devices_faulty": devices.get("FAULTY", 0),
        "devices_not_working": devices.get("NOT_WORKING", 0),
        "items_needing_attention": damaged,
    }
