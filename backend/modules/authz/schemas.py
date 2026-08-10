from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class OverrideIn(BaseModel):
    permission_key: str
    effect: Literal["ALLOW", "DENY"] = "ALLOW"


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: list[str] = []

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("A role needs a name")
        return v.strip()


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[list[str]] = None


class RoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    is_system: bool
    permissions: list[str] = []
    user_count: int = 0


class UserAccessResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    legacy_role: str
    is_legacy_admin: bool
    role_ids: list[UUID]
    roles: list[RoleResponse] = []
    overrides: list[OverrideIn] = []
    # What the roles and overrides actually add up to — the answer to "what can
    # this person do", which neither list gives on its own.
    effective: list[str] = []


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    user_name: Optional[str] = None
    auth_provider: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    is_active: bool = True
