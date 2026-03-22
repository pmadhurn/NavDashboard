from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources: list[dict] | None = None
    token_count: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime | None = None
    message_count: int = 0
    last_message_preview: str | None = None

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    message: ChatMessageResponse
    session_id: UUID


class StreamChunk(BaseModel):
    token: str
    done: bool = False
    sources: list[dict] | None = None


class IngestStatusResponse(BaseModel):
    total_documents: int
    last_sync: datetime | None = None
    ollama_available: bool
    ollama_models: list[str] = []
    embedding_model_available: bool
    chat_model_available: bool


class OllamaHealthResponse(BaseModel):
    available: bool
    url: str
    models: list[str] = []
    error: str | None = None