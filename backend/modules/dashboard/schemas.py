from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_pairs: int
    total_couples: int
    total_devices: int
    active_errors: int
    devices_working: int
    devices_not_working: int
    devices_faulty: int


class StatusDistribution(BaseModel):
    entity_type: str
    working: int
    not_working: int
    faulty: int


class DeviceTypeBreakdown(BaseModel):
    device_type: str
    count: int
    color: str


class ErrorTrendPoint(BaseModel):
    date: str
    count: int
    severity_low: int
    severity_medium: int
    severity_high: int
    severity_critical: int


class RecentActivityItem(BaseModel):
    id: UUID
    action: str
    entity_type: str
    entity_id: UUID
    description: str
    user_id: Optional[UUID] = None
    timestamp: datetime


class PairStatusData(BaseModel):
    status: str
    count: int
    color: str


class HomeSummary(BaseModel):
    """Cross-module KPIs for the NavDashboard landing page. Widgets are permission-gated
    on the frontend; this returns whatever is cheap to compute for everyone."""

    devices_working: int = 0
    devices_faulty: int = 0
    devices_total: int = 0
    couples_total: int = 0
    pairs_total: int = 0
    active_errors: int = 0
    projects_active: int = 0
    equipment_out: int = 0
    damaged_open: int = 0
    my_expenses_month_total: float = 0
    my_expenses_month_count: int = 0
    my_advance_balance: float = 0
    pending_user_approvals: int = 0