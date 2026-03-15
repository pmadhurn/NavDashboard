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