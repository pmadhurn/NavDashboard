from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ai_assistant.models import ChatSession, ChatMessage, EmbeddingDocument


async def create_session(
    db: AsyncSession,
    user_id: UUID,
    title: str = "New Chat",
) -> ChatSession:
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    await db.flush()
    return session


async def get_session(
    db: AsyncSession,
    session_id: UUID,
) -> Optional[ChatSession]:
    stmt = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_sessions(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    # Subquery: count messages per session
    msg_count_sub = (
        select(
            ChatMessage.session_id,
            func.count(ChatMessage.id).label("message_count"),
            func.max(ChatMessage.created_at).label("last_msg_at"),
        )
        .where(ChatMessage.deleted_at.is_(None))
        .group_by(ChatMessage.session_id)
        .subquery()
    )

    # Subquery: last message content per session
    # PostgreSQL requires DISTINCT ON columns to match leading ORDER BY columns
    last_msg_sub = (
        select(
            ChatMessage.session_id,
            ChatMessage.content,
        )
        .where(ChatMessage.deleted_at.is_(None))
        .distinct(ChatMessage.session_id)
        .order_by(ChatMessage.session_id, ChatMessage.created_at.desc())
        .subquery()
    )

    stmt = (
        select(
            ChatSession,
            func.coalesce(msg_count_sub.c.message_count, 0).label("message_count"),
            last_msg_sub.c.content.label("last_message_preview"),
            msg_count_sub.c.last_msg_at,
        )
        .outerjoin(msg_count_sub, ChatSession.id == msg_count_sub.c.session_id)
        .outerjoin(last_msg_sub, ChatSession.id == last_msg_sub.c.session_id)
        .where(
            ChatSession.user_id == user_id,
            ChatSession.deleted_at.is_(None),
        )
        .order_by(desc(func.coalesce(msg_count_sub.c.last_msg_at, ChatSession.created_at)))
        .offset(skip)
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    sessions = []
    for row in rows:
        session_obj = row[0]
        preview_text = row.last_message_preview
        sessions.append({
            "id": session_obj.id,
            "user_id": session_obj.user_id,
            "title": session_obj.title,
            "created_at": session_obj.created_at,
            "updated_at": session_obj.updated_at,
            "message_count": row.message_count or 0,
            "last_message_preview": (preview_text[:100] if preview_text else None),
        })
    return sessions


async def update_session_title(
    db: AsyncSession,
    session_id: UUID,
    title: str,
) -> Optional[ChatSession]:
    session = await get_session(db, session_id)
    if session:
        session.title = title
        await db.flush()
    return session


async def delete_session(db: AsyncSession, session_id: UUID) -> None:
    # Delete messages first
    await db.execute(
        delete(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    # Delete session
    await db.execute(
        delete(ChatSession).where(ChatSession.id == session_id)
    )
    await db.flush()


async def add_message(
    db: AsyncSession,
    session_id: UUID,
    role: str,
    content: str,
    sources: Optional[list[dict]] = None,
    token_count: Optional[int] = None,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        sources=sources,
        token_count=token_count,
    )
    db.add(msg)
    await db.flush()
    return msg


async def get_session_messages(
    db: AsyncSession,
    session_id: UUID,
    skip: int = 0,
    limit: int = 100,
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(
            ChatMessage.session_id == session_id,
            ChatMessage.deleted_at.is_(None),
        )
        .order_by(ChatMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_embedding_count(db: AsyncSession) -> int:
    stmt = select(func.count(EmbeddingDocument.id))
    result = await db.execute(stmt)
    return result.scalar() or 0


async def get_last_sync_time(db: AsyncSession) -> Optional[datetime]:
    stmt = select(func.max(EmbeddingDocument.created_at))
    result = await db.execute(stmt)
    return result.scalar()