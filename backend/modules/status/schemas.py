from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class StatusChangeRequest(BaseModel):
    entity_type: str = Field(pattern="^(device|couple|pair)$")
    entity_id: UUID
    new_status: str = Field(pattern="^(WORKING|NOT_WORKING|FAULTY)$")
    reason: Optional[str] = None


class StatusChangeLogResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    old_status: str
    new_status: str
    changed_by: UUID
    changed_at: datetime
    reason: Optional[str] = None
    model_config = {"from_attributes": True}


class StatusStatsResponse(BaseModel):
    devices: dict[str, int]
    couples: dict[str, int]
    pairs: dict[str, int]