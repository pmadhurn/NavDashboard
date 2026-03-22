import logging
from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sa_text, select

from modules.ai_assistant.embeddings import embed_text, EMBED_DIM

logger = logging.getLogger(__name__)


async def vector_search(
    db: AsyncSession,
    query_text: str,
    limit: int = 5,
    source_types: Optional[list[str]] = None,
) -> list[dict]:
    """Perform pgvector similarity search on embedding_documents."""
    embedding = await embed_text(query_text)
    if embedding is None:
        return []

    vec_str = "[" + ",".join(str(f) for f in embedding) + "]"

    try:
        if source_types:
            sql = sa_text(
                "SELECT id, content, source_type, source_id, metadata_json, "
                "1 - (embedding <=> cast(:query_vec as vector)) as similarity "
                "FROM embedding_documents "
                "WHERE embedding IS NOT NULL "
                "AND source_type = ANY(cast(:source_types as text[])) "
                "ORDER BY embedding <=> cast(:query_vec as vector) "
                "LIMIT :lim"
            )
            result = await db.execute(sql, {
                "query_vec": vec_str,
                "source_types": source_types,
                "lim": limit,
            })
        else:
            sql = sa_text(
                "SELECT id, content, source_type, source_id, metadata_json, "
                "1 - (embedding <=> cast(:query_vec as vector)) as similarity "
                "FROM embedding_documents "
                "WHERE embedding IS NOT NULL "
                "ORDER BY embedding <=> cast(:query_vec as vector) "
                "LIMIT :lim"
            )
            result = await db.execute(sql, {
                "query_vec": vec_str,
                "lim": limit,
            })

        rows = result.fetchall()
        docs = []
        for row in rows:
            docs.append({
                "id": str(row.id),
                "content": row.content,
                "source_type": row.source_type,
                "source_id": str(row.source_id) if row.source_id else None,
                "metadata": row.metadata_json,
                "similarity": float(row.similarity) if row.similarity else 0.0,
            })
        return docs
    except Exception as e:
        logger.error("Vector search error: %s", e)
        return []


async def structured_search(db: AsyncSession, query: str) -> list[dict]:
    """Keyword-based search across main entity tables (works without Ollama)."""
    from modules.devices.models import Device
    from modules.couples.models import Couple
    from modules.pairs.models import Pair
    from modules.troubleshooting.models import ErrorLog

    results = []
    pattern = f"%{query}%"

    # Devices
    try:
        stmt = select(Device).where(
            Device.deleted_at.is_(None),
            Device.serial_number.ilike(pattern),
        ).limit(5)
        res = await db.execute(stmt)
        for d in res.scalars().all():
            results.append({
                "content": f"Device {d.serial_number}, type: {d.device_type}, status: {d.status}",
                "source_type": "device",
                "source_id": str(d.id),
                "similarity": 0.5,
                "metadata": {"serial_number": d.serial_number},
            })
    except Exception as e:
        logger.warning("Structured search devices error: %s", e)

    # Couples
    try:
        stmt = select(Couple).where(
            Couple.deleted_at.is_(None),
            Couple.name.ilike(pattern),
        ).limit(5)
        res = await db.execute(stmt)
        for c in res.scalars().all():
            results.append({
                "content": f"Couple {c.name}, status: {c.status}, has_rf: {c.has_rf}",
                "source_type": "couple",
                "source_id": str(c.id),
                "similarity": 0.5,
                "metadata": {"name": c.name},
            })
    except Exception as e:
        logger.warning("Structured search couples error: %s", e)

    # Pairs
    try:
        stmt = select(Pair).where(
            Pair.deleted_at.is_(None),
            Pair.name.ilike(pattern),
        ).limit(5)
        res = await db.execute(stmt)
        for p in res.scalars().all():
            results.append({
                "content": f"Pair {p.name}, status: {p.status}",
                "source_type": "pair",
                "source_id": str(p.id),
                "similarity": 0.5,
                "metadata": {"name": p.name},
            })
    except Exception as e:
        logger.warning("Structured search pairs error: %s", e)

    # Error Logs
    try:
        stmt = select(ErrorLog).where(
            ErrorLog.deleted_at.is_(None),
            ErrorLog.description.ilike(pattern),
        ).limit(5)
        res = await db.execute(stmt)
        for e_log in res.scalars().all():
            results.append({
                "content": f"Error: {e_log.error_type}, severity: {e_log.severity}, description: {e_log.description}",
                "source_type": "error_log",
                "source_id": str(e_log.id),
                "similarity": 0.4,
                "metadata": {"error_type": e_log.error_type},
            })
    except Exception as e:
        logger.warning("Structured search errors error: %s", e)

    return results


async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    limit: int = 10,
) -> list[dict]:
    """Combine vector search and structured search, deduplicate, sort by relevance."""
    vector_results = await vector_search(db, query, limit=limit)
    structured_results = await structured_search(db, query)

    seen_ids = set()
    merged = []

    for doc in vector_results:
        key = doc.get("source_id") or doc.get("id")
        if key and key not in seen_ids:
            seen_ids.add(key)
            merged.append(doc)

    for doc in structured_results:
        key = doc.get("source_id") or doc.get("id")
        if key and key not in seen_ids:
            seen_ids.add(key)
            merged.append(doc)

    merged.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return merged[:limit]


def build_context(retrieved_docs: list[dict]) -> str:
    """Format retrieved documents into a context string for the LLM prompt."""
    if not retrieved_docs:
        return ""

    lines = ["Context from NavDashboard database:\n"]
    total_chars = 0
    max_chars = 3000

    for doc in retrieved_docs:
        line = f"[Source: {doc.get('source_type', 'unknown')}] {doc.get('content', '')}"
        if total_chars + len(line) > max_chars:
            break
        lines.append(line)
        total_chars += len(line)

    return "\n".join(lines)


def extract_source_references(retrieved_docs: list[dict]) -> list[dict]:
    """Convert retrieved docs into source reference format for the frontend."""
    refs = []
    for doc in retrieved_docs:
        content = doc.get("content", "")
        name = content[:80] if content else "Unknown"

        if doc.get("source_type") == "device" and "Device " in content:
            parts = content.split(",")
            name = parts[0] if parts else name
        elif doc.get("source_type") == "couple" and "Couple " in content:
            parts = content.split(",")
            name = parts[0] if parts else name
        elif doc.get("source_type") == "pair" and "Pair " in content:
            parts = content.split(",")
            name = parts[0] if parts else name
        elif doc.get("source_type") == "error_log" and "Error" in content:
            parts = content.split(",")
            name = parts[0] if parts else name

        refs.append({
            "entity_type": doc.get("source_type", "unknown"),
            "entity_id": doc.get("source_id", ""),
            "name": name.strip(),
            "snippet": content[:150] if content else "",
        })
    return refs