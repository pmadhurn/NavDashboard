from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class MaterialCreate(BaseModel):
    couple_id: Optional[UUID] = None
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit: Optional[str] = None
    is_template: bool = False
    custom_fields: Optional[dict] = None


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    custom_fields: Optional[dict] = None


class MaterialResponse(BaseModel):
    id: UUID
    couple_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    quantity: int
    unit: Optional[str] = None
    is_template: bool
    custom_fields: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TemplateCreate(BaseModel):
    template_name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    materials: list[dict]


class TemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    description: Optional[str] = None
    materials: Optional[list[dict]] = None


class TemplateResponse(BaseModel):
    id: UUID
    template_name: str
    description: Optional[str] = None
    materials: list[dict]
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SuggestionResponse(BaseModel):
    name: str
    count: int