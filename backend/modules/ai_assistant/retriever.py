import logging
from uuid import UUID
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text as sa_text, select

from modules.ai_assistant.embeddings import embed_text, EMBED_DIM

logger = logging.getLogger(__name__)

# The permission key that governs each embedded source_type. A source type not
# listed here is never retrievable — an unknown kind of data must not inherit
# somebody else's grant by defaulting to it.
PERMISSION_BY_SOURCE_TYPE: dict[str, str] = {
    "device": "devices.read",
    "couple": "couples.read",
    "pair": "pairs.read",
    "location": "locations.read",
    "error_log": "troubleshooting.read",
    "troubleshoot": "troubleshooting.read",
    "personnel": "personnel.read",
    "material": "materials.read",
    "asset": "assets.read",
    "asset_report": "assets.reports",
    "project": "projects.read",
    "project_timeline": "projects.read",
    "expense": "finance.read",
    "download_item": "downloads.read",
    "document": "documents.read",
}


def allowed_source_types(granted: set[str] | frozenset[str] | list[str]) -> list[str]:
    """Source types this user may retrieve, given their permission keys.

    Filtering happens at retrieval (SQL), not in the prompt: rows the user
    cannot see never reach the model's context, so no amount of prompting can
    make it disclose them. Never hand the model the whole database and ask it
    to be discreet.

    Takes permission KEYS. It previously took the retired section -> level map,
    which after the authorization migration resolved through a stale legacy
    fallback — so a non-admin's AI context was computed from permissions they
    may never have held.
    """
    granted_set = set(granted)
    return [
        source_type
        for source_type, key in PERMISSION_BY_SOURCE_TYPE.items()
        if key in granted_set
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

    # Personnel
    if permitted("personnel"):
        try:
            from modules.personnel.models import Person

            stmt = select(Person).where(
                Person.deleted_at.is_(None),
                Person.full_name.ilike(pattern),
            ).limit(5)
            res = await db.execute(stmt)
            for p in res.scalars().all():
                results.append({
                    "content": f"Person {p.full_name}, role: {p.role}"
                               + (f", email: {p.email}" if p.email else ""),
                    "source_type": "personnel",
                    "source_id": str(p.id),
                    "similarity": 0.5,
                    "metadata": {"name": p.full_name},
                })
        except Exception as e:
            logger.warning("Structured search personnel error: %s", e)

    # Locations
    if permitted("location"):
        try:
            from modules.locations.models import Location

            stmt = select(Location).where(
                Location.address_note.ilike(pattern),
            ).limit(5)
            res = await db.execute(stmt)
            for loc in res.scalars().all():
                results.append({
                    "content": f"Location {loc.address_note or 'unnamed'} "
                               f"at {loc.latitude:.4f}, {loc.longitude:.4f}",
                    "source_type": "location",
                    "source_id": str(loc.id),
                    "similarity": 0.5,
                    "metadata": {"note": loc.address_note},
                })
        except Exception as e:
            logger.warning("Structured search locations error: %s", e)

    # Documents (metadata only — file contents live in MinIO)
    if permitted("document"):
        try:
            from modules.documents.models import Document

            stmt = select(Document).where(
                Document.deleted_at.is_(None),
                Document.filename.ilike(pattern),
            ).limit(5)
            res = await db.execute(stmt)
            for d in res.scalars().all():
                results.append({
                    "content": f"Document {d.filename} attached to "
                               f"{d.entity_type} {d.entity_id}",
                    "source_type": "document",
                    "source_id": str(d.id),
                    "similarity": 0.5,
                    "metadata": {"filename": d.filename},
                })
        except Exception as e:
            logger.warning("Structured search documents error: %s", e)

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


async def portfolio_snapshot(
    db: AsyncSession, allowed_types: Optional[list[str]] = None
) -> str:
    """A live aggregate summary of every module the user may see.

    Why this exists: retrieval is name-matching. `structured_search` looks for
    the query string inside serial numbers, project names and expense titles,
    so a question like "how many devices are faulty?" or "what did we spend
    this month?" matches nothing and the model answers from thin air — which is
    exactly what it was doing (claiming 1 faulty device when there were 2).

    These counts are cheap, bounded, and always in context, so aggregate
    questions get real numbers instead of a guess.
    """

    def permitted(source_type: str) -> bool:
        return allowed_types is None or source_type in allowed_types

    lines: list[str] = []

    # Every query runs inside its own SAVEPOINT. Postgres aborts the whole
    # transaction on any error, so without this a single schema mismatch takes
    # down the entire chat request with InFailedSQLTransactionError rather than
    # just omitting one line of the summary. (It did exactly that: error_logs
    # has a boolean `resolved`, not a `status` column.)
    async def _run(sql: str):
        try:
            async with db.begin_nested():
                return await db.execute(sa_text(sql))
        except Exception as e:
            logger.warning("Snapshot query failed (%s...): %s", sql[:60], e)
            return None

    async def scalar(sql: str) -> int | float:
        res = await _run(sql)
        return (res.scalar() or 0) if res is not None else 0

    async def grouped(sql: str) -> str:
        res = await _run(sql)
        if res is None:
            return "unavailable"
        return ", ".join(f"{k}: {v}" for k, v in res.fetchall()) or "none"

    if permitted("device"):
        total = await scalar("SELECT COUNT(*) FROM devices WHERE deleted_at IS NULL")
        breakdown = await grouped(
            "SELECT status, COUNT(*) FROM devices WHERE deleted_at IS NULL "
            "GROUP BY status ORDER BY status"
        )
        lines.append(f"Devices: {total} total ({breakdown}).")

        for label, table in (("Couples", "couples"), ("Pairs", "pairs")):
            bd = await grouped(
                f"SELECT status, COUNT(*) FROM {table} WHERE deleted_at IS NULL "  # noqa: S608
                "GROUP BY status ORDER BY status"
            )
            n = await scalar(f"SELECT COUNT(*) FROM {table} WHERE deleted_at IS NULL")  # noqa: S608
            lines.append(f"{label}: {n} total ({bd}).")

    if permitted("error_log"):
        open_errors = await scalar(
            "SELECT COUNT(*) FROM error_logs WHERE deleted_at IS NULL "
            "AND resolved IS NOT TRUE"
        )
        bd = await grouped(
            "SELECT severity, COUNT(*) FROM error_logs WHERE deleted_at IS NULL "
            "AND resolved IS NOT TRUE GROUP BY severity"
        )
        resolved_n = await scalar(
            "SELECT COUNT(*) FROM error_logs WHERE deleted_at IS NULL AND resolved IS TRUE"
        )
        lines.append(f"Error logs: {open_errors} open ({bd}), {resolved_n} resolved.")

    if permitted("project"):
        bd = await grouped(
            "SELECT status, COUNT(*) FROM projects WHERE deleted_at IS NULL GROUP BY status"
        )
        n = await scalar("SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL")
        lines.append(f"Projects: {n} total ({bd}).")

    if permitted("expense"):
        total_spend = await scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE deleted_at IS NULL"
        )
        month_spend = await scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE deleted_at IS NULL "
            "AND expense_date >= date_trunc('month', CURRENT_DATE)"
        )
        n = await scalar("SELECT COUNT(*) FROM expenses WHERE deleted_at IS NULL")
        by_cat = await grouped(
            "SELECT COALESCE(category, 'uncategorised'), "
            "to_char(COALESCE(SUM(amount),0), 'FM999999990.00') FROM expenses "
            "WHERE deleted_at IS NULL GROUP BY 1 ORDER BY SUM(amount) DESC LIMIT 5"
        )
        lines.append(
            f"Expenses: {n} records, {float(total_spend):,.2f} total, "
            f"{float(month_spend):,.2f} this month. Top categories — {by_cat or 'none'}."
        )
        allocated = await scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM fund_allocations WHERE deleted_at IS NULL"
        )
        claims = await scalar(
            "SELECT COUNT(*) FROM expense_claims WHERE deleted_at IS NULL"
        )
        lines.append(
            f"Funds allocated: {float(allocated):,.2f}. Expense claims: {claims}."
        )

    if permitted("asset"):
        bd = await grouped(
            "SELECT status, COUNT(*) FROM assets WHERE deleted_at IS NULL GROUP BY status"
        )
        n = await scalar("SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL")
        lines.append(f"Assets: {n} total ({bd}).")

    if permitted("personnel"):
        n = await scalar("SELECT COUNT(*) FROM personnel WHERE deleted_at IS NULL")
        lines.append(f"Personnel: {n} people on record.")

    if permitted("document"):
        n = await scalar("SELECT COUNT(*) FROM documents WHERE deleted_at IS NULL")
        lines.append(f"Documents: {n} stored.")

    if not lines:
        return ""
    return "Live totals (authoritative — prefer these over any figure you infer):\n" + "\n".join(
        f"- {line}" for line in lines
    )


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