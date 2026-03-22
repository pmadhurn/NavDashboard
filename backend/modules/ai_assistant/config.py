from sqlalchemy.ext.asyncio import AsyncSession
from modules.settings.repository import get_setting
from core.config import settings

async def get_ai_config(db: AsyncSession) -> tuple[str, str, str]:
    url = settings.OLLAMA_BASE_URL
    chat_model = settings.OLLAMA_MODEL
    embed_model = settings.OLLAMA_EMBED_MODEL

    s_url = await get_setting(db, "ollama_url")
    if s_url and s_url.value: url = s_url.value

    s_chat = await get_setting(db, "ollama_model")
    if s_chat and s_chat.value: chat_model = s_chat.value

    s_embed = await get_setting(db, "ollama_embed_model")
    if s_embed and s_embed.value: embed_model = s_embed.value

    return url, chat_model, embed_model
