import logging
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings as app_settings
from modules.settings import repository
from modules.settings.schemas import SettingResponse, SystemInfoResponse

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS: dict[str, tuple[str, str]] = {
    "ollama_url": ("http://host.docker.internal:11434", "Ollama API URL"),
    "ollama_model": ("llama3", "LLM model for chat"),
    "ollama_embed_model": ("nomic-embed-text", "Embedding model"),
    "default_map_lat": ("48.8566", "Default map center latitude"),
    "default_map_lng": ("2.3522", "Default map center longitude"),
    "default_map_zoom": ("13", "Default map zoom level"),
    # Outbound email (modules/mail). Off until enabled and filled in;
    # notifications stay in-app either way.
    "mail_enabled": ("false", "Send emails (true/false). Needs the smtp_* settings"),
    "smtp_host": ("", "SMTP server, e.g. smtp.gmail.com"),
    "smtp_port": ("587", "SMTP port: 587 STARTTLS, 465 SSL"),
    "smtp_user": ("", "SMTP username (usually the sending address)"),
    "smtp_password": ("", "SMTP password or app password"),
    "smtp_from": ("", "From address, e.g. NavDashboard <no-reply@yourdomain>"),
    "smtp_tls": ("true", "Use STARTTLS on ports other than 465"),
    "app_base_url": ("", "Public URL used in email links; empty = first CORS origin"),
}


async def _ensure_defaults(db: AsyncSession) -> None:
    """Seed any default settings that are missing (first boot seeds them all;
    upgrades seed only the new keys, without touching edited values)."""
    rows = await repository.get_all_settings(db)
    existing = {r.key for r in rows}
    added = 0
    for key, (value, description) in DEFAULT_SETTINGS.items():
        if key not in existing:
            await repository.set_setting(db, key, value, description)
            added += 1
    if added:
        await db.commit()
        logger.info("Seeded %d missing default setting(s).", added)


async def get_all_settings(db: AsyncSession) -> list[SettingResponse]:
    await _ensure_defaults(db)
    rows = await repository.get_all_settings(db)
    return [SettingResponse.model_validate(r, from_attributes=True) for r in rows]


async def update_setting(
    db: AsyncSession, key: str, value: str, user_id: UUID
) -> SettingResponse:
    setting = await repository.set_setting(db, key, value)
    # Record audit
    try:
        from shared.audit import record_audit

        await record_audit(
            db,
            action="UPDATE",
            entity_type="system_setting",
            entity_id=setting.id,
            user_id=user_id,
            new_values={"key": key, "value": value},
        )
    except Exception as e:
        logger.warning("Failed to record audit for setting update: %s", e)

    await db.commit()
    await db.refresh(setting)
    return SettingResponse.model_validate(setting, from_attributes=True)


async def get_system_info(db: AsyncSession) -> SystemInfoResponse:
    info = await repository.get_system_info(db)

    # Ollama status
    ollama_url = app_settings.OLLAMA_BASE_URL
    ollama_status = "disconnected"
    ollama_models: list[str] = []

    # Check if there's a stored URL override
    stored = await repository.get_setting(db, "ollama_url")
    if stored and stored.value:
        ollama_url = stored.value

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{ollama_url}/api/tags")
            if resp.status_code == 200:
                ollama_status = "connected"
                data = resp.json()
                ollama_models = [m.get("name", "") for m in data.get("models", [])]
    except Exception:
        ollama_status = "disconnected"

    return SystemInfoResponse(
        version="1.0.0",
        database_size=info["database_size"],
        table_count=info["table_count"],
        total_devices=info["total_devices"],
        total_couples=info["total_couples"],
        total_pairs=info["total_pairs"],
        total_documents=info["total_documents"],
        total_users=info["total_users"],
        total_audit_entries=info["total_audit_entries"],
        total_embeddings=info["total_embeddings"],
        ollama_status=ollama_status,
        ollama_url=ollama_url,
        ollama_models=ollama_models,
        environment=app_settings.ENVIRONMENT,
    )
