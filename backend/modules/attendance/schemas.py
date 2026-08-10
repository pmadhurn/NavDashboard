from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AttendanceDayCreate(BaseModel):
    person_id: UUID
    day: date
    day_type: str
    project_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    departed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    note: Optional[str] = None


class AttendanceDayUpdate(BaseModel):
    day_type: Optional[str] = None
    project_id: Optional[UUID] = None
    phase_id: Optional[UUID] = None
    departed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    note: Optional[str] = None


class AttendanceDayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    person_id: UUID
    person_name: Optional[str] = None
    day: date
    day_type: str
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    phase_id: Optional[UUID] = None
    departed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    note: Optional[str] = None
    logged_by: UUID
    created_at: datetime


class AttendanceSummary(BaseModel):
    """Day-type totals for a person over a range, plus the comp-off balance."""

    person_id: UUID
    person_name: Optional[str] = None
    date_from: date
    date_to: date
    counts: dict[str, int]
    total_logged: int
    comp_off_balance: Decimal


class CompOffEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    person_id: UUID
    entry_type: str
    days: Decimal
    source_day_id: Optional[UUID] = None
    reason: Optional[str] = None
    created_by: UUID
    created_at: datetime


class CompOffAdjust(BaseModel):
    person_id: UUID
    days: Decimal
    reason: str


class CompOffBalance(BaseModel):
    person_id: UUID
    person_name: Optional[str] = None
    balance: Decimal
    accrued: Decimal
    consumed: Decimal


class TeamDayCell(BaseModel):
    """One person's entry on the team board."""

    person_id: UUID
    person_name: str
    day: date
    day_type: Optional[str] = None
    project_name: Optional[str] = None
