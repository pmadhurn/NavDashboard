from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BackupInfo(BaseModel):
    filename: str
    size: int
    created_at: str
    backup_type: str


class ExportRequest(BaseModel):
    format: str = "xlsx"
    tables: Optional[list[str]] = None


class ImportSummary(BaseModel):
    total_rows: int
    created: int
    updated: int
    errors: int
    error_details: Optional[list[str]] = None