from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import require_role, get_current_user
from modules.seeding import service
from modules.seeding.schemas import (
    AdoptPreviewResponse,
    AdoptResponse,
    SeedResponse,
    SeedStatusResponse,
    UnseedResponse,
)

router = APIRouter()


@router.get("/status", response_model=SeedStatusResponse)
async def get_seed_status(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Per-module row counts and how many are registered as demo data."""
    return await service.seed_status(db)


@router.post("/run", response_model=SeedResponse)
async def run_seed(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Seed every module that is still empty. Safe to run twice."""
    return await service.seed_all(db, current_user.id)


@router.get("/adopt/preview", response_model=AdoptPreviewResponse)
async def preview_adopt(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Per-module count of rows adopt would claim. Read-only."""
    return await service.adopt_preview(db)


@router.post("/adopt", response_model=AdoptResponse)
async def adopt_existing(
    confirm: str = "",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark all unregistered rows as demo data so they can be removed.

    Claims *every* unregistered row — it cannot tell old demo data from records
    you entered by hand. Requires `?confirm=ADOPT`; check `/adopt/preview` first.
    """
    if confirm != "ADOPT":
        raise HTTPException(
            status_code=400,
            detail=(
                "Pass ?confirm=ADOPT. This marks every unregistered row as demo "
                "data, including any real records. Check /seeding/adopt/preview first."
            ),
        )
    return await service.adopt_existing(db)


@router.delete("/", response_model=UnseedResponse)
async def remove_seeded(
    confirm: str = "",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete every registered demo row. Nothing else is touched.

    Requires `?confirm=REMOVE` so a stray DELETE can't wipe the demo set.
    """
    if confirm != "REMOVE":
        raise HTTPException(
            status_code=400,
            detail="Pass ?confirm=REMOVE to confirm removal of seeded data.",
        )
    return await service.unseed_all(db)
