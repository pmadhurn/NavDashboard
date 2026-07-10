from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AssetCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: Optional[UUID] = None
    sort_order: int = 0


class AssetCategoryResponse(BaseModel):
    id: UUID
    name: str
    parent_id: Optional[UUID] = None
    sort_order: int

    model_config = {"from_attributes": True}


class PersonBrief(BaseModel):
    id: UUID
    full_name: str

    model_config = {"from_attributes": True}


class AssetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    asset_code: Optional[str] = None  # auto-generated when omitted
    category_id: Optional[UUID] = None
    item_kind: str = "SERIALIZED"
    serial_number: Optional[str] = None
    quantity: int = 1
    status: str = "IN_OFFICE"
    current_person_id: Optional[UUID] = None
    device_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_code: Optional[str] = None
    category_id: Optional[UUID] = None
    item_kind: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: Optional[int] = None
    status: Optional[str] = None
    current_project_id: Optional[UUID] = None
    current_person_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None
    custom_fields: Optional[dict] = None
    status_note: Optional[str] = None  # recorded in history when status changes


class AssetResponse(BaseModel):
    id: UUID
    asset_code: str
    name: str
    category: Optional[AssetCategoryResponse] = None
    item_kind: str
    serial_number: Optional[str] = None
    quantity: int
    status: str
    current_project_id: Optional[UUID] = None
    current_person: Optional[PersonBrief] = None
    device_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AssetHistoryResponse(BaseModel):
    id: UUID
    event_type: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    project_id: Optional[UUID] = None
    person_id: Optional[UUID] = None
    note: Optional[str] = None
    performed_by: Optional[UUID] = None
    occurred_at: datetime

    model_config = {"from_attributes": True}


class AssetReportCreate(BaseModel):
    report_type: str  # DAMAGED | REQUIREMENT
    asset_id: Optional[UUID] = None
    title: str = Field(min_length=1, max_length=300)
    details: Optional[str] = None
    quantity: int = 1


class AssetReportUpdate(BaseModel):
    status: Optional[str] = None  # OPEN | ORDERED | RESOLVED
    details: Optional[str] = None
    quantity: Optional[int] = None


class DeployedItem(BaseModel):
    type: str  # device | couple | pair | asset
    id: UUID
    label: str
    status: Optional[str] = None
    custody: Optional[str] = None


class DeployedGroup(BaseModel):
    project_id: Optional[UUID] = None
    project_name: str
    items: list[DeployedItem]


class AssetReportResponse(BaseModel):
    id: UUID
    report_type: str
    asset_id: Optional[UUID] = None
    asset: Optional[AssetResponse] = None
    title: str
    details: Optional[str] = None
    quantity: int
    status: str
    reported_by: UUID
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
