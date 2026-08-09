import json
import logging
from uuid import UUID
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from modules.ai_assistant import repository
from modules.ai_assistant import chain
from modules.ai_assistant import embeddings
from modules.ai_assistant.schemas import (
    ChatMessageResponse,
    ChatSessionResponse,
    ChatResponse,
    IngestStatusResponse,
    OllamaHealthResponse,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)


async def _allowed_types_for_user(db: AsyncSession, user_id: UUID) -> Optional[list[str]]:
    """Source types this user may retrieve; None = unrestricted (admin)."""
    from core.dependencies import get_permission_map
    from modules.ai_assistant.retriever import allowed_source_types
    from modules.auth import repository as auth_repository

    user = await auth_repository.get_by_id(db, user_id)
    if not user:
        return []
    if user.role == "ADMIN":
        return None
    return allowed_source_types(await get_permission_map(db, user))


async def send_message(
    db: AsyncSession,
    session_id: Optional[UUID],
    user_id: UUID,
    content: str,
) -> dict:
    """Send a message and get a full (non-streaming) AI response."""
    # Create session if needed
    if session_id is None:
        title = await chain.generate_session_title(db, content)
        session = await repository.create_session(db, user_id, title)
        session_id = session.id
    else:
        session = await repository.get_session(db, session_id)
        if session is None:
            session = await repository.create_session(db, user_id, "New Chat")
            session_id = session.id

    # Save user message
    user_msg = await repository.add_message(db, session_id, "user", content)

    # Load chat history
    messages = await repository.get_session_messages(db, session_id, limit=10)
    chat_history = [{"role": m.role, "content": m.content} for m in messages]

    # Generate response (retrieval scoped to the user's permissions)
    allowed_types = await _allowed_types_for_user(db, user_id)
    result = await chain.generate_response(db, content, chat_history, allowed_types=allowed_types)

    # Save assistant message
    assistant_msg = await repository.add_message(
        db,
        session_id,
        "assistant",
        result["content"],
        sources=result.get("sources"),
        token_count=len(result["content"].split()),
    )

    await db.commit()

    return {
        "message": ChatMessageResponse(
            id=assistant_msg.id,
            session_id=session_id,
            role="assistant",
            content=assistant_msg.content,
            sources=assistant_msg.sources,
            token_count=assistant_msg.token_count,
            created_at=assistant_msg.created_at,
        ),
        "session_id": session_id,
    }


async def send_message_stream(
    db: AsyncSession,
    session_id: Optional[UUID],
    user_id: UUID,
    content: str,
    think: bool = False,
) -> AsyncGenerator[str, None]:
    """Send a message and stream the AI response via SSE."""
    # Create session if needed
    if session_id is None:
        title = await chain.generate_session_title(db, content)
        session = await repository.create_session(db, user_id, title)
        session_id = session.id
    else:
        session = await repository.get_session(db, session_id)
        if session is None:
            session = await repository.create_session(db, user_id, "New Chat")
            session_id = session.id

    # Save user message
    await repository.add_message(db, session_id, "user", content)

    # Load chat history
    messages = await repository.get_session_messages(db, session_id, limit=10)
    chat_history = [{"role": m.role, "content": m.content} for m in messages]

    # Emit session_id for the client
    yield f"data: {json.dumps({'session_id': str(session_id), 'token': '', 'done': False})}\n\n"

    # Stream response and accumulate (retrieval scoped to the user's permissions)
    allowed_types = await _allowed_types_for_user(db, user_id)
    accumulated = ""
    sources = []

    async for chunk_str in chain.generate_response_stream(
        db,
        content,
        chat_history,
        allowed_types=allowed_types,
        think=think,
    ):
        yield chunk_str
        # Parse chunk to accumulate
        try:
            if chunk_str.startswith("data: "):
                data = json.loads(chunk_str[6:].strip())
                if data.get("token"):
                    accumulated += data["token"]
                if data.get("done") and data.get("sources"):
                    sources = data["sources"]
        except (json.JSONDecodeError, KeyError):
            pass

    # Save assistant message after streaming completes
    if accumulated:
        await repository.add_message(
            db,
            session_id,
            "assistant",
            accumulated,
            sources=sources if sources else None,
            token_count=len(accumulated.split()),
        )
        await db.commit()


async def get_sessions(
    db: AsyncSession,
    user_id: UUID,
) -> list[dict]:
    return await repository.get_user_sessions(db, user_id)


async def get_session_messages(
    db: AsyncSession,
    session_id: UUID,
) -> list[ChatMessageResponse]:
    messages = await repository.get_session_messages(db, session_id)
    return [
        ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            sources=m.sources,
            token_count=m.token_count,
            created_at=m.created_at,
        )
        for m in messages
    ]


async def get_session_detail(
    db: AsyncSession,
    session_id: UUID,
) -> Optional[dict]:
    session = await repository.get_session(db, session_id)
    if session is None:
        return None
    messages = await get_session_messages(db, session_id)
    return {
        "session": ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=len(messages),
        ),
        "messages": messages,
    }


async def delete_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: UUID,
) -> None:
    session = await repository.get_session(db, session_id)
    if session and session.user_id == user_id:
        await repository.delete_session(db, session_id)
        await db.commit()


async def trigger_sync(
    db: AsyncSession,
    user_id: UUID,
) -> dict:
    result = await embeddings.sync_all_embeddings(db)
    try:
        await record_audit(
            db,
            action="AI_EMBEDDING_SYNC",
            entity_type="ai_assistant",
            entity_id=user_id,
            user_id=user_id,
            new_values=result,
        )
        await db.commit()
    except Exception as e:
        logger.warning("Audit record for sync failed: %s", e)
    return result


async def get_ingest_status(db: AsyncSession) -> IngestStatusResponse:
    available, models = await embeddings.check_ollama_available(db)
    doc_count = await repository.get_embedding_count(db)
    last_sync = await repository.get_last_sync_time(db)

    from modules.ai_assistant.config import get_ai_config
    _, chat_model, embed_model = await get_ai_config(db)

    return IngestStatusResponse(
        total_documents=doc_count,
        last_sync=last_sync,
        ollama_available=available,
        ollama_models=models,
        chat_model=chat_model,
        embedding_model=embed_model,
        embedding_model_available=any(embed_model in m for m in models),
        chat_model_available=any(chat_model in m for m in models),
    )


async def get_health(db: AsyncSession) -> OllamaHealthResponse:
    available, models = await embeddings.check_ollama_available(db)
    from modules.ai_assistant.config import get_ai_config
    url, _, _ = await get_ai_config(db)
    return OllamaHealthResponse(
        available=available,
        url=url,
        models=models,
        error=None if available else "Ollama is not running or not reachable",
    )


def settings_embed_model() -> str:
    from core.config import settings as cfg
    return cfg.OLLAMA_EMBED_MODEL


def settings_chat_model() -> str:
    from core.config import settings as cfg
    return cfg.OLLAMA_MODEL