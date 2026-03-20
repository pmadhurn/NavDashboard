from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.search.schemas import GlobalSearchResponse, SearchSuggestion
from modules.search.service import global_search, get_suggestions

router = APIRouter()


@router.get("/global", response_model=GlobalSearchResponse)
async def search_global(
    q: str = Query(..., min_length=2, description="Search query"),
    entity_types: str | None = Query(None, description="Comma-separated entity types"),
    limit: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
    device_type: str | None = Query(None),
    severity: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    types_list = None
    if entity_types:
        types_list = [t.strip() for t in entity_types.split(",") if t.strip()]

    filters = {}
    if status:
        filters["status"] = status
    if device_type:
        filters["device_type"] = device_type
    if severity:
        filters["severity"] = severity

    return await global_search(
        db, query=q, entity_types=types_list, limit=limit, filters=filters or None
    )


@router.get("/suggestions", response_model=list[SearchSuggestion])
async def search_suggestions(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_suggestions(db, query=q, limit=limit)