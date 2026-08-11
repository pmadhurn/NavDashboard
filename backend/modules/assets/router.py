from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.assets import service
from modules.assets.schemas import (
    AssetCategoryCreate,
    AssetCategoryResponse,
    AssetCreate,
    AssetHistoryResponse,
    AssetReportCreate,
    AssetReportResponse,
    AssetReportUpdate,
    AssetResponse,
    AssetUpdate,
    DeployedGroup,
)
from shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[AssetResponse])
async def list_assets(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    project_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_assets(
        db,
        PaginationParams(page=page, size=size),
        search=search,
        category_id=category_id,
        status=status,
        project_id=project_id,
        source=source,
    )


@router.get("/deployed", response_model=list[DeployedGroup])
async def deployed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_deployed(db)


@router.post("/backfill-devices")
async def backfill_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.backfill_device_assets(db)


@router.post("/", response_model=AssetResponse, status_code=201)
async def create_asset(
    body: AssetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_asset(db, body, current_user.id)


@router.get("/categories", response_model=list[AssetCategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_categories(db)


@router.post("/categories", response_model=AssetCategoryResponse, status_code=201)
async def create_category(
    body: AssetCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_category(db, body)


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_category(db, category_id)
    return {"detail": "Category deleted"}


@router.get("/lookup/{code}", response_model=AssetResponse)
async def lookup_by_code(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve an asset from its code, serial number, or barcode/QR/RFID tag."""
    return await service.lookup_by_code(db, code)


@router.get("/reports", response_model=list[AssetReportResponse])
async def list_reports(
    report_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_reports(db, report_type=report_type, status=status)


@router.post("/reports", response_model=AssetReportResponse, status_code=201)
async def create_report(
    body: AssetReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_report(db, body, current_user.id)


@router.put("/reports/{report_id}", response_model=AssetReportResponse)
async def update_report(
    report_id: UUID,
    body: AssetReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_report(db, report_id, body, current_user.id)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = await service.get_asset(db, asset_id)
    return AssetResponse.model_validate(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: UUID,
    body: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_asset(db, asset_id, body, current_user.id)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_asset(db, asset_id, current_user.id)
    return {"detail": "Asset deleted"}


@router.get("/{asset_id}/history", response_model=list[AssetHistoryResponse])
async def get_asset_history(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_asset_history(db, asset_id)
