from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AuditEntryResponse(BaseModel):
    id: UUID
    action: str
    entity_type: str
    entity_id: UUID
    changed_by: Optional[UUID] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    timestamp: datetime
    user_name: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AuditStatsResponse(BaseModel):
    total_entries: int
    by_action: dict[str, int]
    by_entity_type: dict[str, int]
    most_active_users: list[dict]