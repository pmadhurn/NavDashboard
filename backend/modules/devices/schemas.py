from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from modules.devices.constants import STATUS_COLORS, DeviceStatus


class DeviceCreate(BaseModel):
    serial_number: str = Field(min_length=1, max_length=50)
    device_type: str
    status: str = "WORKING"
    couple_id: Optional[UUID] = None
    handling_person_id: Optional[UUID] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    metadata_json: Optional[dict] = None


class DeviceUpdate(BaseModel):
    serial_number: Optional[str] = None
    device_type: Optional[str] = None
    status: Optional[str] = None
    couple_id: Optional[UUID] = None
    handling_person_id: Optional[UUID] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    metadata_json: Optional[dict] = None


class DeviceResponse(BaseModel):
    id: UUID
    serial_number: str
    device_type: str
    status: str
    status_color: str = ""
    couple_id: Optional[UUID] = None
    handling_person_id: Optional[UUID] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    metadata_json: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_status_color(self) -> "DeviceResponse":
        try:
            self.status_color = STATUS_COLORS[DeviceStatus(self.status)]
        except (ValueError, KeyError):
            self.status_color = "#888888"
        return self


class DeviceStatusHistoryResponse(BaseModel):
    id: UUID
    device_id: UUID
    old_status: str
    new_status: str
    changed_by: UUID
    changed_at: datetime
    reason: Optional[str] = None

    model_config = {"from_attributes": True}


class DeviceStatsResponse(BaseModel):
    total: int
    by_type: dict[str, int]
    by_status: dict[str, int]


class StatusChangeRequest(BaseModel):
    status: str
    reason: Optional[str] = None