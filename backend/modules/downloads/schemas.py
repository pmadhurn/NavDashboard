from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    sort_order: int = 0


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class VersionResponse(BaseModel):
    id: UUID
    version_label: Optional[str] = None
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    release_notes: Optional[str] = None
    uploaded_by: UUID
    download_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    category: Optional[CategoryResponse] = None
    item_type: str
    visibility: str
    tags: Optional[dict] = None
    uploaded_by: UUID
    created_at: datetime
    versions: list[VersionResponse] = []
    allowed_user_ids: list[UUID] = []

    model_config = {"from_attributes": True}


class ItemListResponse(BaseModel):
    items: list[ItemResponse]
    total: int


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    item_type: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[dict] = None
    allowed_user_ids: Optional[list[UUID]] = None
