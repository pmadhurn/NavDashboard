from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class PersonUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class PersonResponse(BaseModel):
    id: UUID
    full_name: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AssignmentHistoryResponse(BaseModel):
    id: UUID
    person_id: UUID
    entity_type: str
    entity_id: UUID
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None

    model_config = {"from_attributes": True}