import logging
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.ai_assistant import service
from modules.ai_assistant.schemas import (
    ChatMessageCreate,
    ChatResponse,
    ChatSessionResponse,
    ChatMessageResponse,
    IngestStatusResponse,
    OllamaHealthResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatMessageCreate,
    session_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await service.send_message(db, session_id, current_user.id, request.content)
    return ChatResponse(
        message=result["message"],
        session_id=result["session_id"],
    )


@router.post("/chat/stream")
async def chat_stream(
    request: ChatMessageCreate,
    session_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    async def event_generator():
        async for chunk in service.send_message_stream(
            db, session_id, current_user.id, request.content
        ):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = await service.get_sessions(db, current_user.id)
    return sessions


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detail = await service.get_session_detail(db, session_id)
    if detail is None:
        from core.exceptions import NotFoundException
        raise NotFoundException("Chat session not found")
    return detail


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_session(db, session_id, current_user.id)
    return {"detail": "Session deleted"}


@router.post("/ingest")
async def trigger_ingest(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await service.trigger_sync(db, current_user.id)
    return result


@router.get("/ingest/status", response_model=IngestStatusResponse)
async def ingest_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_ingest_status(db)


@router.get("/health", response_model=OllamaHealthResponse)
async def health(
    current_user: User = Depends(get_current_user),
):
    return await service.get_health()
    