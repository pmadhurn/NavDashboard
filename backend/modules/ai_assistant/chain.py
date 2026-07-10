import httpx
import json
import logging
from uuid import UUID
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from modules.ai_assistant.retriever import hybrid_retrieve, build_context, extract_source_references
from modules.ai_assistant.prompts import SYSTEM_PROMPT, NO_OLLAMA_MESSAGE, NO_CONTEXT_MESSAGE
from modules.ai_assistant.embeddings import check_ollama_available
from modules.ai_assistant.config import get_ai_config

logger = logging.getLogger(__name__)


def _permission_note(allowed_types: Optional[list[str]]) -> str:
    if allowed_types is None:
        return ""
    from modules.ai_assistant.retriever import SECTION_BY_SOURCE_TYPE

    allowed_sections = sorted({SECTION_BY_SOURCE_TYPE[t] for t in allowed_types})
    blocked_sections = sorted(set(SECTION_BY_SOURCE_TYPE.values()) - set(allowed_sections))
    if not blocked_sections:
        return ""
    return (
        f"\n\nThis user has access to these sections only: {', '.join(allowed_sections)}. "
        f"They do NOT have access to: {', '.join(blocked_sections)}. If asked about data "
        "from a section they can't access, say they don't have access to it — never guess."
    )


async def generate_response(
    db: AsyncSession,
    user_message: str,
    chat_history: Optional[list[dict]] = None,
    allowed_types: Optional[list[str]] = None,
) -> dict:
    """Non-streaming RAG response."""
    url, chat_model, _ = await get_ai_config(db)
    available, _ = await check_ollama_available(db)
    if not available:
        return {"content": NO_OLLAMA_MESSAGE, "sources": []}

    # Retrieve context (permission-filtered at SQL level)
    retrieved = await hybrid_retrieve(db, user_message, allowed_types=allowed_types)
    context = build_context(retrieved)
    source_refs = extract_source_references(retrieved)

    # Build messages
    system_content = SYSTEM_PROMPT + _permission_note(allowed_types)
    if context:
        system_content += "\n\n" + context

    messages = [{"role": "system", "content": system_content}]

    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{url}/api/chat",
                json={
                    "model": chat_model,
                    "messages": messages,
                    "stream": False,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("message", {}).get("content", "")
                return {"content": content, "sources": source_refs}
            else:
                logger.error("Ollama chat error: status=%s body=%s", resp.status_code, resp.text[:300])
                return {
                    "content": "I encountered an error generating a response. Please try again.",
                    "sources": [],
                }
    except Exception as e:
        logger.error("Ollama chat exception: %s", e)
        return {
            "content": "I encountered an error generating a response. Please try again.",
            "sources": [],
        }


async def generate_response_stream(
    db: AsyncSession,
    user_message: str,
    chat_history: Optional[list[dict]] = None,
    allowed_types: Optional[list[str]] = None,
    think: bool = False,
) -> AsyncGenerator[str, None]:
    """Streaming RAG response via SSE."""
    url, chat_model, _ = await get_ai_config(db)
    available, _ = await check_ollama_available(db)
    if not available:
        yield f"data: {json.dumps({'token': NO_OLLAMA_MESSAGE, 'done': True, 'sources': []})}\n\n"
        return

    # Retrieve context (permission-filtered at SQL level)
    retrieved = await hybrid_retrieve(db, user_message, allowed_types=allowed_types)
    context = build_context(retrieved)
    source_refs = extract_source_references(retrieved)

    # Build messages
    system_content = SYSTEM_PROMPT + _permission_note(allowed_types)
    if context:
        system_content += "\n\n" + context

    messages = [{"role": "system", "content": system_content}]

    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_message})

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{url}/api/chat",
                json={
                    "model": chat_model,
                    "messages": messages,
                    "stream": True,
                    "think": think,
                },
            ) as resp:
                if resp.status_code != 200:
                    yield f"data: {json.dumps({'token': 'Error: Failed to get response from AI model.', 'done': True, 'sources': []})}\n\n"
                    return

                accumulated_think = ""
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        token = chunk.get("message", {}).get("content", "")
                        done = chunk.get("done", False)

                        # Extract thinking content if present and enabled
                        thinking = chunk.get("message", {}).get("thinking")
                        if thinking and think:
                            accumulated_think += thinking
                            yield f"data: {json.dumps({'think': thinking, 'done': False})}\n\n"

                        if token:
                            yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"

                        if done:
                            yield f"data: {json.dumps({'token': '', 'done': True, 'sources': source_refs, 'think': accumulated_think if think else None})}\n\n"
                            return
                    except json.JSONDecodeError:
                        continue

        # If we get here without a done signal
        yield f"data: {json.dumps({'token': '', 'done': True, 'sources': source_refs})}\n\n"

    except Exception as e:
        logger.error("Ollama stream error: %s", e)
        yield f"data: {json.dumps({'token': 'I encountered an error generating a response. Please try again.', 'done': True, 'sources': []})}\n\n"


async def generate_session_title(db: AsyncSession, user_message: str) -> str:
    """Generate a short title for a chat session."""
    url, chat_model, _ = await get_ai_config(db)
    available, _ = await check_ollama_available(db)
    if not available:
        return user_message[:50].strip() or "New Chat"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{url}/api/chat",
                json={
                    "model": chat_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": (
                                f"Generate a very short title (5 words max) for a conversation "
                                f"that starts with: {user_message[:200]}. Respond with just the title, no quotes."
                            ),
                        }
                    ],
                    "stream": False,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("message", {}).get("content", "").strip()
                return title[:100] if title else user_message[:50]
            return user_message[:50].strip() or "New Chat"
    except Exception as e:
        logger.warning("Title generation failed: %s", e)
        return user_message[:50].strip() or "New Chat"