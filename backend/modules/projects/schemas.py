from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonBrief(BaseModel):
    id: UUID
    full_name: str
    role: Optional[str] = None

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    project_type: str = "POC"  # POC | DEMO | INSTALLATION | OTHER
    customer_name: Optional[str] = None
    site_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[datetime] = None
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None  # ACTIVE | ON_HOLD | COMPLETED | CLOSED
    customer_name: Optional[str] = None
    site_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    custom_fields: Optional[dict] = None


class MemberResponse(BaseModel):
    id: UUID
    person: PersonBrief
    role_in_project: Optional[str] = None
    joined_at: datetime
    left_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MemberAdd(BaseModel):
    person_id: Optional[UUID] = None
    # Or create a new person inline:
    new_person_name: Optional[str] = None
    new_person_role: Optional[str] = None
    role_in_project: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    project_type: str
    status: str
    customer_name: Optional[str] = None
    site_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    description: Optional[str] = None
    created_by: UUID
    created_at: datetime
    members: list[MemberResponse] = []
    custom_fields: Optional[dict] = None

    model_config = {"from_attributes": True}


class ProjectSummary(BaseModel):
    equipment_out: int
    last_activity: Optional[datetime] = None
    member_count: int
    open_issues: int = 0


class TimelineEntryCreate(BaseModel):
    entry_type: str = "NOTE"  # VISIT | CALL | NOTE | STATUS_CHANGE | EQUIPMENT | DOCUMENT | ISSUE | EXPENSE
    title: str = Field(min_length=1, max_length=500)
    body: Optional[str] = None
    entry_date: Optional[datetime] = None


class TimelineEntryResponse(BaseModel):
    id: UUID
    entry_type: str
    title: str
    body: Optional[str] = None
    entry_date: datetime
    created_by: Optional[UUID] = None
    metadata_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetBrief(BaseModel):
    id: UUID
    asset_code: str
    name: str

    model_config = {"from_attributes": True}


class MovementItemCreate(BaseModel):
    asset_id: UUID
    quantity: int = 1
    condition_note: Optional[str] = None


class MovementCreate(BaseModel):
    direction: str = "OUTWARD"
    movement_date: Optional[datetime] = None
    handled_by: Optional[UUID] = None
    received_by_name: Optional[str] = None
    notes: Optional[str] = None
    items: list[MovementItemCreate] = []


class MovementItemResponse(BaseModel):
    id: UUID
    asset: AssetBrief
    quantity: int
    condition_note: Optional[str] = None
    item_status: str
    return_outcome: Optional[str] = None
    outcome_note: Optional[str] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MovementResponse(BaseModel):
    id: UUID
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    direction: str
    purpose: str = "DEPLOYMENT"
    movement_date: datetime
    handled_by: Optional[UUID] = None
    handler: Optional[PersonBrief] = None
    received_by_name: Optional[str] = None
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: list[MovementItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemReturn(BaseModel):
    """Mark an outward item as returned / damaged / lost."""

    item_status: str  # RETURNED | WITH_CLIENT | DAMAGED | LOST
    condition_note: Optional[str] = None


class PhaseCreate(BaseModel):
    phase_type: str  # DESKTOP_SURVEY | PHYSICAL_SURVEY | INSTALLATION | MAINTENANCE | OTHER
    lead_person_id: Optional[UUID] = None
    note: Optional[str] = None


class PhaseUpdate(BaseModel):
    status: Optional[str] = None  # ACTIVE | COMPLETED
    lead_person_id: Optional[UUID] = None
    note: Optional[str] = None


class PhaseResponse(BaseModel):
    id: UUID
    project_id: UUID
    phase_type: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    lead_person_id: Optional[UUID] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemberMove(BaseModel):
    """Move a project member to another project (leave here + join there)."""

    target_project_id: UUID
    role_in_project: Optional[str] = None


class ProjectCloseRequest(BaseModel):
    departing_member_ids: list[UUID] = []
    force: bool = False  # proceed even if equipment is still out


class OutwardLine(BaseModel):
    """One line of an outward form. Either an existing asset (asset_id) or a new
    item to be created on the fly (name). quantity for bulk items."""

    asset_id: Optional[UUID] = None
    name: Optional[str] = None
    quantity: int = 1
    condition_note: Optional[str] = None


class OutwardRequest(BaseModel):
    items: list[OutwardLine] = []
    handled_by: Optional[UUID] = None
    received_by_name: Optional[str] = None
    notes: Optional[str] = None
    phase_id: Optional[UUID] = None
    purpose: str = "DEPLOYMENT"  # DEPLOYMENT | TESTING | POC | OTHER
    expected_return_date: Optional[datetime] = None
    confirm: bool = False  # set true to proceed despite warnings


class StandaloneOutwardRequest(OutwardRequest):
    """An outward raised from Inventory rather than a project page. The
    project is optional — compulsory only when the purpose is DEPLOYMENT."""

    project_id: Optional[UUID] = None


class OutwardLineResult(BaseModel):
    index: int
    asset_id: Optional[UUID] = None
    label: str
    requested: int
    available: int
    conflict: str  # NONE | INSUFFICIENT | NEW_ITEM
    message: Optional[str] = None


class OutwardPreview(BaseModel):
    lines: list[OutwardLineResult]
    has_conflicts: bool


class DeploymentCreate(BaseModel):
    entity_type: str  # device | couple | pair | asset
    entity_id: UUID
    note: Optional[str] = None


class DeploymentResponse(BaseModel):
    id: UUID
    project_id: UUID
    entity_type: str
    entity_id: UUID
    label: Optional[str] = None
    sub: Optional[str] = None
    deployed_at: datetime
    removed_at: Optional[datetime] = None
    note: Optional[str] = None

    model_config = {"from_attributes": True}
