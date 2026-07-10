import logging
from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sa_text, select

from modules.ai_assistant.embeddings import embed_text, EMBED_DIM

logger = logging.getLogger(__name__)

# Which permission section governs each embedded source_type. Anything not
# listed is treated as requiring 'devices' (the legacy default scope).
SECTION_BY_SOURCE_TYPE: dict[str, str] = {
    "device": "devices",
    "couple": "devices",
    "pair": "devices",
    "location": "devices",
    "error_log": "troubleshooting",
    "troubleshoot": "troubleshooting",
    "personnel": "personnel",
    "material": "inventory",
    "asset": "inventory",
    "asset_report": "inventory",
    "project": "projects",
    "project_timeline": "projects",
    "expense": "finance",
    "download_item": "downloads",
    "document": "documents",
}


def allowed_source_types(perm_map: dict[str, str]) -> list[str]:
    """Source types the user may retrieve, based on their section permissions.

    Filtering happens at retrieval (SQL), not in the prompt — data from
    sections the user can't see never reaches the model context.
    """
    from core.permissions import level_satisfies

    return [
        source_type
        for source_type, section in SECTION_BY_SOURCE_TYPE.items()
        if level_satisfies(perm_map.get(section, "NONE"), "VIEW")
    ]


async def vector_search(
    db: AsyncSession,
    query_text: str,
    limit: int = 5,
    source_types: Optional[list[str]] = None,
) -> list[dict]:
    """Perform pgvector similarity search on embedding_documents."""
    embedding = await embed_text(db, query_text)
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


async def structured_search(
    db: AsyncSession,
    query: str,
    allowed_types: Optional[list[str]] = None,
) -> list[dict]:
    """Keyword-based search across main entity tables (works without Ollama).

    `allowed_types` (from allowed_source_types) gates which entities are
    searched; None means no restriction (legacy/admin).
    """
    from modules.devices.models import Device
    from modules.couples.models import Couple
    from modules.pairs.models import Pair
    from modules.troubleshooting.models import ErrorLog

    def permitted(source_type: str) -> bool:
        return allowed_types is None or source_type in allowed_types

    results = []
    pattern = f"%{query}%"

    # Projects
    if permitted("project"):
        try:
            from modules.projects.models import Project

            stmt = select(Project).where(
                Project.deleted_at.is_(None),
                Project.name.ilike(pattern),
            ).limit(5)
            res = await db.execute(stmt)
            for p in res.scalars().all():
                results.append({
                    "content": (
                        f"Project {p.name}, type: {p.project_type}, status: {p.status}, "
                        f"customer: {p.customer_name or 'n/a'}, site: {p.site_location or 'n/a'}"
                    ),
                    "source_type": "project",
                    "source_id": str(p.id),
                    "similarity": 0.5,
                    "metadata": {"name": p.name},
                })
        except Exception as e:
            logger.warning("Structured search projects error: %s", e)

    # Assets
    if permitted("asset"):
        try:
            from modules.assets.models import Asset

            stmt = select(Asset).where(
                Asset.deleted_at.is_(None),
                (Asset.name.ilike(pattern)) | (Asset.asset_code.ilike(pattern)),
            ).limit(5)
            res = await db.execute(stmt)
            for a in res.scalars().all():
                results.append({
                    "content": f"Asset {a.asset_code} {a.name}, status: {a.status}, kind: {a.item_kind}",
                    "source_type": "asset",
                    "source_id": str(a.id),
                    "similarity": 0.5,
                    "metadata": {"asset_code": a.asset_code},
                })
        except Exception as e:
            logger.warning("Structured search assets error: %s", e)

    # Expenses
    if permitted("expense"):
        try:
            from modules.finance.models import Expense

            stmt = select(Expense).where(
                Expense.deleted_at.is_(None),
                Expense.title.ilike(pattern),
            ).limit(5)
            res = await db.execute(stmt)
            for x in res.scalars().all():
                results.append({
                    "content": f"Expense {x.title}, amount: {x.currency} {float(x.amount):,.2f}, date: {x.expense_date:%Y-%m-%d}",
                    "source_type": "expense",
                    "source_id": str(x.id),
                    "similarity": 0.5,
                    "metadata": {"title": x.title},
                })
        except Exception as e:
            logger.warning("Structured search expenses error: %s", e)

    # Devices
    if permitted("device"):
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
    if permitted("couple"):
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
    if permitted("pair"):
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
    if not permitted("error_log"):
        return results
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
    allowed_types: Optional[list[str]] = None,
) -> list[dict]:
    """Combine vector search and structured search, deduplicate, sort by relevance.

    `allowed_types` restricts retrieval to the user's permitted sections;
    None means unrestricted (admin).
    """
    vector_results = await vector_search(db, query, limit=limit, source_types=allowed_types)
    structured_results = await structured_search(db, query, allowed_types=allowed_types)

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