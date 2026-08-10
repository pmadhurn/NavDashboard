from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class UpdateCreate(BaseModel):
    body: str
    posted_for: Optional[date] = None  # defaults to today
    project_id: Optional[UUID] = None
    person_id: Optional[UUID] = None  # defaults to the author's own personnel row

    @field_validator("body")
    @classmethod
    def body_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("An update needs a body")
        return v.strip()


class UpdateEdit(BaseModel):
    body: Optional[str] = None
    project_id: Optional[UUID] = None
    posted_for: Optional[date] = None


class CommentCreate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def body_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("A comment needs a body")
        return v.strip()


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    update_id: UUID
    author_id: UUID
    author_name: Optional[str] = None
    body: str
    created_at: datetime


class UpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    author_name: Optional[str] = None
    person_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    body: str
    posted_for: date
    created_at: datetime
    comment_count: int = 0
    comments: list[CommentResponse] = []


class LeadershipSummary(BaseModel):
    """Everything the leadership home needs, in one request.

    One endpoint rather than eight: the page is a single glance, and eight
    round-trips would make it a progressively-appearing page instead.
    """

    generated_at: datetime
    # People
    people_total: int
    on_field_today: int
    in_office_today: int
    away_today: int
    not_logged_today: int
    # Work
    active_projects: int
    projects_by_status: dict[str, int]
    # Devices
    devices_total: int
    devices_working: int
    devices_faulty: int
    open_errors: int
    # Money
    spend_this_month: float
    pending_claims: int
    pending_claim_value: float
    # Equipment
    assets_deployed: int
    # Recent activity
    recent_updates: list[UpdateResponse]
