from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.system import service

router = APIRouter()


@router.get("/health")
async def system_health(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Whether the platform is healthy, in language that does not assume you
    built it."""
    return await service.system_health(db, request.app)
