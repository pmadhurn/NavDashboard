import httpx
import logging
from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, delete, func

from core.config import settings
from modules.ai_assistant.models import EmbeddingDocument

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
EMBED_MODEL = settings.OLLAMA_EMBED_MODEL
EMBED_DIM = settings.OLLAMA_EMBED_DIMENSION


async def check_ollama_available() -> tuple[bool, list[str]]:
    """Check if Ollama is reachable and list available models."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                model_names = [m.get("name", "") for m in data.get("models", [])]
                return (True, model_names)
            return (False, [])
    except Exception as e:
        logger.warning("Ollama not available: %s", e)
        return (False, [])


async def embed_text(content: str) -> Optional[list[float]]:
    """Generate embedding vector for a text string using Ollama."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": content},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("embedding")
            logger.warning("Ollama embed failed: status=%s body=%s", resp.status_code, resp.text[:200])
            return None
    except Exception as e:
        logger.warning("Ollama embed_text error: %s", e)
        return None


async def embed_and_store(
    db: AsyncSession,
    content: str,
    source_type: str,
    source_id: Optional[UUID] = None,
    metadata: Optional[dict] = None,
) -> Optional[EmbeddingDocument]:
    """Embed text and store as an EmbeddingDocument row."""
    embedding = await embed_text(content)
    if embedding is None:
        return None

    doc = EmbeddingDocument(
        content=content,
        source_type=source_type,
        source_id=source_id,
        embedding=embedding,
        metadata_json=metadata,
    )
    db.add(doc)
    await db.flush()
    return doc


async def batch_embed_and_store(db: AsyncSession, items: list[dict]) -> int:
    """Embed and store a batch of items. Returns count of successfully stored."""
    count = 0
    batch_size = 10
    for i in range(0, len(items), batch_size):
        batch = items[i : i + batch_size]
        for item in batch:
            result = await embed_and_store(
                db,
                content=item["content"],
                source_type=item["source_type"],
                source_id=item.get("source_id"),
                metadata=item.get("metadata"),
            )
            if result is not None:
                count += 1
        await db.commit()
    return count


async def sync_all_embeddings(db: AsyncSession) -> dict:
    """Main ingestion function: query all entities and create/update embeddings."""
    available, _ = await check_ollama_available()
    if not available:
        return {"total_synced": 0, "error": "Ollama not available"}

    from modules.devices.models import Device
    from modules.couples.models import Couple
    from modules.pairs.models import Pair
    from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
    from modules.personnel.models import Person
    from modules.inventory.models import FittingMaterial
    from modules.locations.models import LocationHistory

    summary: dict = {"total_synced": 0, "by_type": {}, "errors": 0}

    async def _sync_entity(source_type: str, query, format_fn):
        """Helper: delete old embeddings for this type, then re-embed all rows."""
        try:
            # Delete existing embeddings for this source_type
            await db.execute(
                delete(EmbeddingDocument).where(EmbeddingDocument.source_type == source_type)
            )
            await db.flush()

            result = await db.execute(query)
            rows = result.scalars().all()
            count = 0
            batch_items = []
            for row in rows:
                text_content = format_fn(row)
                if not text_content:
                    continue
                batch_items.append({
                    "content": text_content,
                    "source_type": source_type,
                    "source_id": row.id,
                    "metadata": {"source_type": source_type},
                })

            if batch_items:
                count = await batch_embed_and_store(db, batch_items)

            summary["by_type"][source_type] = count
            summary["total_synced"] += count
        except Exception as e:
            logger.error("Error syncing %s: %s", source_type, e)
            summary["errors"] += 1

    # 1. Devices
    await _sync_entity(
        "device",
        select(Device).where(Device.deleted_at.is_(None)),
        lambda d: f"Device {d.serial_number}, type: {d.device_type}, status: {d.status}, notes: {d.notes or 'none'}",
    )

    # 2. Couples
    await _sync_entity(
        "couple",
        select(Couple).where(Couple.deleted_at.is_(None)),
        lambda c: f"Couple {c.name}, status: {c.status}, has_rf: {c.has_rf}, notes: {c.notes or 'none'}",
    )

    # 3. Pairs
    await _sync_entity(
        "pair",
        select(Pair).where(Pair.deleted_at.is_(None)),
        lambda p: f"Pair {p.name}, status: {p.status}, notes: {p.notes or 'none'}",
    )

    # 4. Error Logs
    await _sync_entity(
        "error_log",
        select(ErrorLog).where(ErrorLog.deleted_at.is_(None)),
        lambda e: f"Error: {e.error_type}, severity: {e.severity}, description: {e.description}, resolved: {e.resolved}",
    )

    # 5. Troubleshoot Entries
    await _sync_entity(
        "troubleshoot",
        select(TroubleshootEntry),
        lambda t: f"Troubleshoot step: {t.step_description}, action: {t.action_taken or 'none'}, resolution: {t.resolution or 'none'}",
    )

    # 6. Personnel
    await _sync_entity(
        "personnel",
        select(Person).where(Person.deleted_at.is_(None)),
        lambda p: f"Personnel {p.full_name}, role: {p.role}, email: {p.email or 'none'}",
    )

    # 7. Fitting Materials
    await _sync_entity(
        "material",
        select(FittingMaterial).where(FittingMaterial.deleted_at.is_(None)),
        lambda m: f"Material {m.name}, quantity: {m.quantity} {m.unit or ''}, couple_id: {m.couple_id or 'unassigned'}",
    )

    # 8. Location History
    await _sync_entity(
        "location",
        select(LocationHistory),
        lambda lh: (
            f"Location change for couple {lh.couple_id}: "
            f"moved from ({lh.old_latitude},{lh.old_longitude}) to ({lh.new_latitude},{lh.new_longitude}), "
            f"distance: {lh.distance_meters or 0}m"
        ),
    )

    await db.commit()
    return summary