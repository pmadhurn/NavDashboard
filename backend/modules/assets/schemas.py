from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssetCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    parent_id: Optional[UUID] = None
    sort_order: int = 0
    requires_serial: bool = False


class AssetCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    sort_order: Optional[int] = None
    requires_serial: Optional[bool] = None


class AssetCategoryResponse(BaseModel):
    id: UUID
    name: str
    parent_id: Optional[UUID] = None
    sort_order: int
    requires_serial: bool = False

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
    current_person_id: Optional[UUID] = None
    device_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    vendor_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None


class AssetUpdate(BaseModel):
    """Descriptive fields only.

    Custody and condition are changed through their own endpoints, which write
    the movement ledger. A settable `status` that nothing reads is how two
    sources of truth come back.
    """

    name: Optional[str] = None
    asset_code: Optional[str] = None
    category_id: Optional[UUID] = None
    item_kind: Optional[str] = None
    serial_number: Optional[str] = None
    quantity: Optional[int] = None
    current_project_id: Optional[UUID] = None
    current_person_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    vendor_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None
    custom_fields: Optional[dict] = None


class AssetResponse(BaseModel):
    id: UUID
    asset_code: str
    name: str
    category: Optional[AssetCategoryResponse] = None
    item_kind: str
    serial_number: Optional[str] = None
    quantity: int
    current_project_id: Optional[UUID] = None
    current_person: Optional[PersonBrief] = None
    device_id: Optional[UUID] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    vendor_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[dict] = None
    tag_identifiers: Optional[dict] = None
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # --- custody (Phase 1) ---
    custody_type: str = "LOCATION"
    custody_id: Optional[UUID] = None
    custody_label: Optional[str] = None
    condition: str = "OK"
    expected_return_date: Optional[datetime] = None
    # Derived, never stored: in a stock location and in working order.
    is_available: bool = False

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


# --- custody, locations, parties (Phase 1) ---------------------------------


class StockLocationCreate(BaseModel):
    name: str
    kind: str = "OFFICE"
    address: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0
    is_default: bool = False


class StockLocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    kind: str
    address: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int
    is_default: bool


class PartyCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


class PartyUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


class PartyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None


class MoveCustodyRequest(BaseModel):
    """Where an item is going, and why."""

    to_custody_type: str
    to_custody_id: Optional[UUID] = None
    reason: Optional[str] = None
    event_type: str = "MOVED"
    expected_return_date: Optional[datetime] = None


class SetConditionRequest(BaseModel):
    condition: str
    reason: Optional[str] = None


class AssetMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset_id: UUID
    event_type: str
    from_custody_type: Optional[str] = None
    from_custody_id: Optional[UUID] = None
    from_label: Optional[str] = None
    to_custody_type: Optional[str] = None
    to_custody_id: Optional[UUID] = None
    to_label: Optional[str] = None
    from_condition: Optional[str] = None
    to_condition: Optional[str] = None
    quantity: int
    reason: Optional[str] = None
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None
    performed_by: Optional[UUID] = None
    occurred_at: datetime


class LocationCount(BaseModel):
    location: str
    count: int


class CustodySummary(BaseModel):
    total: int
    available: int
    overdue: int
    needs_reconciliation: int
    by_custody: dict[str, int]
    by_condition: dict[str, int]
    by_location: list[LocationCount]


# --- movement: handover, kits, returns, repairs (Phase 2) -------------------


class HandoverCreate(BaseModel):
    from_person_id: UUID
    to_person_id: UUID
    asset_ids: list[UUID]
    note: Optional[str] = None


class HandoverRespond(BaseModel):
    accept: bool
    note: Optional[str] = None


class HandoverItemBrief(BaseModel):
    id: UUID
    asset_code: str
    name: str


class HandoverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_person_id: UUID
    from_name: Optional[str] = None
    to_person_id: UUID
    to_name: Optional[str] = None
    status: str
    note: Optional[str] = None
    response_note: Optional[str] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    items: list[HandoverItemBrief] = []


class BundleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_ids: list[UUID] = []


class BundleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    asset_ids: Optional[list[UUID]] = None


class BundleItemBrief(BaseModel):
    id: UUID
    asset_code: str
    name: str
    quantity: int
    available: bool


class BundleResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    items: list[BundleItemBrief] = []


class ResolveItemRequest(BaseModel):
    """What happened to one item that went out."""

    asset_id: UUID
    outcome: str
    note: Optional[str] = None
    project_id: Optional[UUID] = None
    customer_id: Optional[UUID] = None
    site_location_id: Optional[UUID] = None
    responsible_person_id: Optional[UUID] = None
    expected_return_date: Optional[datetime] = None


class ResolveBatchRequest(BaseModel):
    items: list[ResolveItemRequest]


class DamageReport(BaseModel):
    asset_id: UUID
    details: str
    damage_location: Optional[str] = None
    responsible_person_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    damaged_at: Optional[datetime] = None


class SendForRepair(BaseModel):
    vendor_id: Optional[UUID] = None
    cost: Optional[float] = None
    note: Optional[str] = None


class CompleteRepair(BaseModel):
    repaired: bool = True
    cost: Optional[float] = None
    note: Optional[str] = None
    return_location_id: Optional[UUID] = None


class RepairResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    asset_id: UUID
    asset_code: Optional[str] = None
    asset_name: Optional[str] = None
    status: str
    damage_details: str
    damaged_at: Optional[datetime] = None
    damage_location: Optional[str] = None
    responsible_person_id: Optional[UUID] = None
    responsible_name: Optional[str] = None
    project_id: Optional[UUID] = None
    is_repairable: Optional[bool] = None
    vendor_id: Optional[UUID] = None
    cost: Optional[float] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    outcome_note: Optional[str] = None
    created_at: datetime


# --- required items (Plan V2 Phase 4) ---------------------------------------


class ItemRequestCreate(BaseModel):
    title: str
    details: Optional[str] = None
    quantity: int = 1
    needed_by: Optional[datetime] = None
    vendor_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None


class ItemRequestUpdate(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    quantity: Optional[int] = None
    needed_by: Optional[datetime] = None
    vendor_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None


class ItemRequestStatusChange(BaseModel):
    status: str
    status_note: Optional[str] = None
    vendor_id: Optional[UUID] = None
    estimated_cost: Optional[float] = None


class ItemRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    details: Optional[str] = None
    quantity: int
    needed_by: Optional[datetime] = None
    status: str
    requested_by: UUID
    requested_by_name: Optional[str] = None
    vendor_id: Optional[UUID] = None
    vendor_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    status_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
