from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SettingResponse(BaseModel):
    key: str
    value: str | None
    description: str | None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


class SystemInfoResponse(BaseModel):
    version: str
    database_size: str
    table_count: int
    total_devices: int
    total_couples: int
    total_pairs: int
    total_documents: int
    total_users: int
    total_audit_entries: int
    total_embeddings: int
    ollama_status: str
    ollama_url: str
    ollama_models: list[str]
    environment: str


class UserCreateRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: str
    role: str  # "ADMIN", "TECHNICIAN", "VIEWER"


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
