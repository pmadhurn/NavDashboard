from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


SEVERITY_COLORS: dict[str, str] = {
    "LOW": "#6E6E6E",
    "MEDIUM": "#B68A3C",
    "HIGH": "#9B3E3E",
    "CRITICAL": "#6E2C2C",
}


class ErrorLogCreate(BaseModel):
    device_id: Optional[UUID] = None
    couple_id: Optional[UUID] = None
    pair_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    error_type: str = Field(min_length=1, max_length=200)
    severity: str = Field(pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    description: str = Field(min_length=1)
    reported_by: Optional[UUID] = None
    custom_fields: Optional[dict] = None


class ErrorLogUpdate(BaseModel):
    error_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    custom_fields: Optional[dict] = None


class TroubleshootEntryCreate(BaseModel):
    step_description: str = Field(min_length=1)
    action_taken: Optional[str] = None
    resolution: Optional[str] = None
    performed_by: Optional[UUID] = None
    custom_fields: Optional[dict] = None


class TroubleshootEntryUpdate(BaseModel):
    step_description: Optional[str] = None
    action_taken: Optional[str] = None
    resolution: Optional[str] = None
    performed_by: Optional[UUID] = None
    custom_fields: Optional[dict] = None


class TroubleshootEntryResponse(BaseModel):
    id: UUID
    error_id: UUID
    step_number: int
    step_description: str
    action_taken: Optional[str] = None
    resolution: Optional[str] = None
    performed_by: Optional[UUID] = None
    performed_by_name: Optional[str] = None
    performed_at: datetime
    custom_fields: Optional[dict] = None
    model_config = {"from_attributes": True}


class ErrorLogResponse(BaseModel):
    id: UUID
    device_id: Optional[UUID] = None
    couple_id: Optional[UUID] = None
    pair_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    asset_id: Optional[UUID] = None
    error_type: str
    severity: str
    severity_color: str
    description: str
    reported_by: Optional[UUID] = None
    reported_by_name: Optional[str] = None
    reported_at: datetime
    resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolved_by_name: Optional[str] = None
    steps: list[TroubleshootEntryResponse] = []
    custom_fields: Optional[dict] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None
    resolved_by: Optional[UUID] = None


class ErrorStatsResponse(BaseModel):
    total: int
    open: int
    resolved: int
    by_severity: dict[str, int]
    by_type: dict[str, int]