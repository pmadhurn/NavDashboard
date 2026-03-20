from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from modules.search.schemas import GlobalSearchResponse, SearchResult, SearchSuggestion
from modules.search.repository import (
    search_devices,
    search_couples,
    search_pairs,
    search_personnel,
    search_errors,
)
from modules.search.indexer import calculate_relevance


ENTITY_TYPE_MAP = {
    "device": search_devices,
    "couple": search_couples,
    "pair": search_pairs,
    "personnel": search_personnel,
    "error": search_errors,
}


async def global_search(
    db: AsyncSession,
    query: str,
    entity_types: Optional[list[str]] = None,
    limit: int = 50,
    filters: Optional[dict] = None,
) -> GlobalSearchResponse:
    if entity_types:
        types_to_search = [t for t in entity_types if t in ENTITY_TYPE_MAP]
    else:
        types_to_search = list(ENTITY_TYPE_MAP.keys())

    all_results: list[SearchResult] = []
    entity_counts: dict[str, int] = {}

    for entity_type in types_to_search:
        search_fn = ENTITY_TYPE_MAP[entity_type]
        raw_results = await search_fn(db, query, filters=filters, limit=limit)

        count = len(raw_results)
        entity_counts[entity_type] = count

        for raw in raw_results:
            score = calculate_relevance(raw["name"], query)
            if raw.get("description"):
                desc_score = calculate_relevance(raw["description"], query)
                score = max(score, desc_score)

            all_results.append(
                SearchResult(
                    id=raw["id"],
                    entity_type=raw["entity_type"],
                    name=raw["name"],
                    description=raw.get("description"),
                    status=raw.get("status"),
                    extra=raw.get("extra"),
                    score=score,
                )
            )

    all_results.sort(key=lambda r: r.score, reverse=True)

    if len(all_results) > limit:
        all_results = all_results[:limit]

    return GlobalSearchResponse(
        results=all_results,
        total=len(all_results),
        query=query,
        entity_counts=entity_counts,
    )


async def get_suggestions(
    db: AsyncSession,
    query: str,
    limit: int = 10,
) -> list[SearchSuggestion]:
    suggestions: list[SearchSuggestion] = []

    devices = await search_devices(db, query, limit=limit)
    for d in devices:
        suggestions.append(
            SearchSuggestion(text=d["name"], entity_type="device", entity_id=d["id"])
        )

    couples = await search_couples(db, query, limit=limit)
    for c in couples:
        suggestions.append(
            SearchSuggestion(text=c["name"], entity_type="couple", entity_id=c["id"])
        )

    pairs = await search_pairs(db, query, limit=limit)
    for p in pairs:
        suggestions.append(
            SearchSuggestion(text=p["name"], entity_type="pair", entity_id=p["id"])
        )

    personnel = await search_personnel(db, query, limit=limit)
    for p in personnel:
        suggestions.append(
            SearchSuggestion(text=p["name"], entity_type="personnel", entity_id=p["id"])
        )

    suggestions.sort(
        key=lambda s: calculate_relevance(s.text, query),
        reverse=True,
    )

    return suggestions[:limit]