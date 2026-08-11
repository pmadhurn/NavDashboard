from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.dashboard import service
from modules.dashboard.schemas import (
    DashboardStats,
    DeviceTypeBreakdown,
    ErrorTrendPoint,
    HomeSummary,
    PairStatusData,
    RecentActivityItem,
    StatusDistribution,
)

router = APIRouter()


@router.get("/home", response_model=HomeSummary)
async def home_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_home_summary(db, current_user.id)


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_dashboard_stats(db)


@router.get("/status-distribution", response_model=list[StatusDistribution])
async def status_distribution(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_status_distribution(db)


@router.get("/device-type-breakdown", response_model=list[DeviceTypeBreakdown])
async def device_type_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_device_type_breakdown(db)


@router.get("/error-trends", response_model=list[ErrorTrendPoint])
async def error_trends(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_error_trends(db, days=days)


@router.get("/recent-activity", response_model=list[RecentActivityItem])
async def recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_recent_activity(db, limit=limit)


@router.get("/pair-status", response_model=list[PairStatusData])
async def pair_status(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await service.get_pair_status_data(db)


# --- role homes (Phase 5) ---------------------------------------------------


@router.get("/home-for-me")
async def home_for_me(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Which home this person should land on, and its numbers.

    One request, because the client cannot know which home to ask for until the
    server tells it — and two round-trips would show the wrong page first.
    """
    from modules.dashboard import role_service

    home = await role_service.resolve_home(db, current_user)
    data = {}
    if home == "inventory":
        data = await role_service.inventory_home(db)
    elif home == "finance":
        data = await role_service.finance_home(db)
    elif home == "rnd":
        data = await role_service.rnd_home(db)
    return {"home": home, "data": data}
