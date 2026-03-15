from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from modules.couples.schemas import CoupleResponse


class PairCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    couple_ids: list[UUID] = Field(min_length=2, max_length=2)
    handling_person_id: Optional[UUID] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class PairUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    status_override: Optional[bool] = None
    handling_person_id: Optional[UUID] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class PairResponse(BaseModel):
    id: UUID
    name: str
    status: str
    status_color: str
    status_override: bool
    handling_person_id: Optional[UUID] = None
    handling_person_name: Optional[str] = None
    couples: list[CoupleResponse] = []
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PairStatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]