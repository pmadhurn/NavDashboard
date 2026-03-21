from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ReportTemplate(BaseModel):
    id: str
    name: str
    description: str
    parameters: list[str]


class ReportRequest(BaseModel):
    template_id: str
    format: str = "pdf"
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    entity_ids: Optional[list[UUID]] = None
    include_charts: bool = True


class ReportResponse(BaseModel):
    filename: str
    format: str
    size: int
    generated_at: datetime