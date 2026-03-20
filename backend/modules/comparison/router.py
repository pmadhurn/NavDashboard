from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.comparison.schemas import CompareRequest, ComparisonResult
from modules.comparison.service import compare_couples, compare_pairs, compare_devices

router = APIRouter()


@router.post("/couples", response_model=ComparisonResult)
async def compare_couples_endpoint(
    body: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await compare_couples(db, body.entity_id_1, body.entity_id_2)


@router.post("/pairs", response_model=ComparisonResult)
async def compare_pairs_endpoint(
    body: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await compare_pairs(db, body.entity_id_1, body.entity_id_2)


@router.post("/devices", response_model=ComparisonResult)
async def compare_devices_endpoint(
    body: CompareRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await compare_devices(db, body.entity_id_1, body.entity_id_2)