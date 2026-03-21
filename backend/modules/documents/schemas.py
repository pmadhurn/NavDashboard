from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    description: Optional[str] = None


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: int
    storage_path: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    uploaded_by: UUID
    description: Optional[str] = None
    created_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    size: int
    pages: int