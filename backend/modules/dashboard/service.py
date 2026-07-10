from sqlalchemy.ext.asyncio import AsyncSession

from modules.dashboard import repository
from modules.dashboard.schemas import (
    DashboardStats,
    DeviceTypeBreakdown,
    ErrorTrendPoint,
    HomeSummary,
    PairStatusData,
    RecentActivityItem,
    StatusDistribution,
)

DEVICE_TYPE_COLORS: dict[str, str] = {
    "IU": "#6B7F8C",
    "OU": "#8C6B7C",
    "HC": "#6B8C7A",
    "RF": "#8C836B",
}

PAIR_STATUS_COLORS: dict[str, str] = {
    "WORKING": "#5F8F6B",
    "NOT_WORKING": "#B68A3C",
    "FAULTY": "#9B3E3E",
}


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    entity_counts = await repository.get_entity_counts(db)
    active_errors = await repository.get_active_error_count(db)
    device_status = await repository.get_device_status_counts(db)

    return DashboardStats(
        total_pairs=entity_counts["total_pairs"],
        total_couples=entity_counts["total_couples"],
        total_devices=entity_counts["total_devices"],
        active_errors=active_errors,
        devices_working=device_status["devices_working"],
        devices_not_working=device_status["devices_not_working"],
        devices_faulty=device_status["devices_faulty"],
    )


async def get_status_distribution(db: AsyncSession) -> list[StatusDistribution]:
    raw = await repository.get_status_distribution(db)
    return [StatusDistribution(**item) for item in raw]


async def get_device_type_breakdown(db: AsyncSession) -> list[DeviceTypeBreakdown]:
    raw = await repository.get_device_type_breakdown(db)
    result: list[DeviceTypeBreakdown] = []
    for item in raw:
        color = DEVICE_TYPE_COLORS.get(item["device_type"], "#7A7A7A")
        result.append(DeviceTypeBreakdown(
            device_type=item["device_type"],
            count=item["count"],
            color=color,
        ))
    return result


async def get_error_trends(db: AsyncSession, days: int = 30) -> list[ErrorTrendPoint]:
    raw = await repository.get_error_trends(db, days=days)
    return [ErrorTrendPoint(**item) for item in raw]


async def get_recent_activity(db: AsyncSession, limit: int = 20) -> list[RecentActivityItem]:
    raw = await repository.get_recent_activity(db, limit=limit)
    return [RecentActivityItem(**item) for item in raw]


async def get_pair_status_data(db: AsyncSession) -> list[PairStatusData]:
    raw = await repository.get_pair_status_breakdown(db)
    result: list[PairStatusData] = []
    for item in raw:
        color = PAIR_STATUS_COLORS.get(item["status"], "#7A7A7A")
        result.append(PairStatusData(
            status=item["status"],
            count=item["count"],
            color=color,
        ))
    return result


async def get_home_summary(db: AsyncSession, user_id) -> HomeSummary:
    """Aggregate cross-module KPIs for the landing page in a single call.

    Each metric is wrapped defensively so a missing table/module never breaks
    the whole landing page.
    """
    from datetime import datetime, timezone

    from sqlalchemy import func, select

    summary = HomeSummary()

    async def _scalar(stmt, default=0):
        try:
            return (await db.execute(stmt)).scalar_one() or default
        except Exception:
            return default

    # Devices / couples / pairs / errors — reuse the existing repository helpers
    try:
        counts = await repository.get_entity_counts(db)
        summary.devices_total = counts.get("total_devices", 0)
        summary.couples_total = counts.get("total_couples", 0)
        summary.pairs_total = counts.get("total_pairs", 0)
        status = await repository.get_device_status_counts(db)
        summary.devices_working = status.get("devices_working", 0)
        summary.devices_faulty = status.get("devices_faulty", 0)
        summary.active_errors = await repository.get_active_error_count(db)
    except Exception:
        pass

    # Active projects
    try:
        from modules.projects.models import Project

        summary.projects_active = await _scalar(
            select(func.count()).select_from(Project).where(
                Project.deleted_at.is_(None), Project.status == "ACTIVE"
            )
        )
    except Exception:
        pass

    # Equipment currently out + open damaged reports
    try:
        from modules.assets.models import Asset, AssetReport

        summary.equipment_out = await _scalar(
            select(func.count()).select_from(Asset).where(
                Asset.deleted_at.is_(None), Asset.status == "WITH_PROJECT"
            )
        )
        summary.damaged_open = await _scalar(
            select(func.count()).select_from(AssetReport).where(
                AssetReport.deleted_at.is_(None),
                AssetReport.report_type == "DAMAGED",
                AssetReport.status != "RESOLVED",
            )
        )
    except Exception:
        pass

    # My expenses this month
    try:
        from modules.finance.models import Expense

        month_start = datetime.now(timezone.utc).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        summary.my_expenses_month_total = float(
            await _scalar(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    Expense.deleted_at.is_(None),
                    Expense.added_by == user_id,
                    Expense.expense_date >= month_start,
                )
            )
        )
        summary.my_expenses_month_count = await _scalar(
            select(func.count()).select_from(Expense).where(
                Expense.deleted_at.is_(None),
                Expense.added_by == user_id,
                Expense.expense_date >= month_start,
            )
        )
    except Exception:
        pass

    # Pending user approvals (useful for admins; harmless otherwise)
    try:
        from modules.auth.models import User

        summary.pending_user_approvals = await _scalar(
            select(func.count()).select_from(User).where(
                User.deleted_at.is_(None), User.status == "PENDING"
            )
        )
    except Exception:
        pass

    return summary