from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LocationCreate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address_note: Optional[str] = None


class LocationUpdate(BaseModel):
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    address_note: Optional[str] = None


class LocationResponse(BaseModel):
    id: UUID
    latitude: float
    longitude: float
    address_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LocationHistoryResponse(BaseModel):
    id: UUID
    couple_id: UUID
    old_latitude: float
    old_longitude: float
    new_latitude: float
    new_longitude: float
    moved_at: datetime
    handled_by: Optional[UUID] = None
    had_rf: bool
    distance_meters: Optional[float] = None
    fitting_materials_snapshot: Optional[list[dict]] = None  # THIS WAS dict, now list[dict]
    configuration_snapshot: Optional[dict] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MapDataPoint(BaseModel):
    couple_id: UUID
    couple_name: str
    latitude: float
    longitude: float
    status: str
    has_rf: bool