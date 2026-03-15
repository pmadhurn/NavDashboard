from sqlalchemy.ext.asyncio import AsyncSession

from modules.dashboard import repository
from modules.dashboard.schemas import (
    DashboardStats,
    DeviceTypeBreakdown,
    ErrorTrendPoint,
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