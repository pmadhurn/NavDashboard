from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class SearchResult(BaseModel):
    id: UUID
    entity_type: str
    name: str
    description: Optional[str] = None
    status: Optional[str] = None
    extra: Optional[dict] = None
    score: float = 0.0

    class Config:
        from_attributes = True


class GlobalSearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    query: str
    entity_counts: dict[str, int]


class SearchSuggestion(BaseModel):
    text: str
    entity_type: str
    entity_id: UUID


class AdvancedSearchParams(BaseModel):
    query: Optional[str] = None
    entity_types: Optional[list[str]] = None
    status: Optional[str] = None
    device_type: Optional[str] = None
    severity: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    handling_person_id: Optional[UUID] = None