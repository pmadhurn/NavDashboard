from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from modules.devices.schemas import DeviceResponse
from modules.inventory.schemas import MaterialResponse
from modules.locations.schemas import LocationCreate, LocationResponse


class MaterialCreateInline(BaseModel):
    name: str
    quantity: int = 1
    unit: Optional[str] = None


class CoupleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    pair_id: Optional[UUID] = None
    has_rf: bool = False
    status: str = "WORKING"
    handling_person_id: Optional[UUID] = None
    location: Optional[LocationCreate] = None
    device_ids: Optional[list[UUID]] = None
    fitting_materials: Optional[list[MaterialCreateInline]] = None
    configuration: Optional[dict] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    copy_materials_from: Optional[UUID] = None
    template_id: Optional[UUID] = None


class CoupleUpdate(BaseModel):
    name: Optional[str] = None
    pair_id: Optional[UUID] = None
    has_rf: Optional[bool] = None
    status: Optional[str] = None
    handling_person_id: Optional[UUID] = None
    configuration: Optional[dict] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class CoupleResponse(BaseModel):
    id: UUID
    name: str
    pair_id: Optional[UUID] = None
    has_rf: bool
    status: str
    status_color: str = ""
    handling_person_id: Optional[UUID] = None
    handling_person_name: Optional[str] = None
    location_id: Optional[UUID] = None
    location: Optional[LocationResponse] = None
    devices: list[DeviceResponse] = []
    materials: list[MaterialResponse] = []
    configuration: Optional[dict] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CoupleSummary(BaseModel):
    id: UUID
    name: str
    status: str
    status_color: str
    has_rf: bool
    location: Optional[LocationResponse] = None
    device_count: int

    model_config = {"from_attributes": True}


class LocationChangeRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address_note: Optional[str] = None
    notes: Optional[str] = None