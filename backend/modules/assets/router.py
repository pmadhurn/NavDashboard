from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.assets import custody_service, service
from modules.assets.schemas import (
    AssetCategoryCreate,
    AssetCategoryResponse,
    AssetCreate,
    AssetHistoryResponse,
    AssetMovementResponse,
    AssetReportCreate,
    AssetReportResponse,
    AssetReportUpdate,
    AssetResponse,
    AssetUpdate,
    CustodySummary,
    DeployedGroup,
    MoveCustodyRequest,
    PartyCreate,
    PartyResponse,
    SetConditionRequest,
    StockLocationCreate,
    StockLocationResponse,
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


# --- custody: places, parties, movement (Phase 1) ---------------------------


@router.get("/custody/summary", response_model=CustodySummary)
async def custody_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Counts the Inventory Manager opens the module to see."""
    return await custody_service.custody_summary(db)


@router.get("/locations", response_model=list[StockLocationResponse])
async def list_locations(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.list_locations(db)


@router.post("/locations", response_model=StockLocationResponse, status_code=201)
async def create_location(
    body: StockLocationCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.create_location(db, body, user.id)


@router.delete("/locations/{location_id}", status_code=204)
async def delete_location(
    location_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await custody_service.delete_location(db, location_id, user.id)


@router.get("/customers", response_model=list[PartyResponse])
async def list_customers(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.list_parties(db, "customers")


@router.post("/customers", response_model=PartyResponse, status_code=201)
async def create_customer(
    body: PartyCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.create_party(db, "customers", body, user.id)


@router.get("/vendors", response_model=list[PartyResponse])
async def list_vendors(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.list_parties(db, "vendors")


@router.post("/vendors", response_model=PartyResponse, status_code=201)
async def create_vendor(
    body: PartyCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await custody_service.create_party(db, "vendors", body, user.id)


@router.get("/{asset_id}/movements", response_model=list[AssetMovementResponse])
async def asset_movements(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """One item's whole history: where it has been and what happened to it."""
    return await custody_service.list_movements(db, asset_id)


@router.post("/{asset_id}/custody", response_model=AssetResponse)
async def move_asset_custody(
    asset_id: UUID,
    body: MoveCustodyRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    asset = await service.get_asset(db, asset_id)
    await custody_service.move_custody(
        db, asset,
        to_custody_type=body.to_custody_type,
        to_custody_id=body.to_custody_id,
        event_type=body.event_type,
        reason=body.reason,
        expected_return_date=body.expected_return_date,
        user_id=user.id,
    )
    return AssetResponse.model_validate(asset)


@router.post("/{asset_id}/condition", response_model=AssetResponse)
async def set_asset_condition(
    asset_id: UUID,
    body: SetConditionRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Report damage, repair or loss. Deliberately does not move the item —
    an item can be damaged wherever it happens to be."""
    asset = await service.get_asset(db, asset_id)
    await custody_service.set_condition(
        db, asset, condition=body.condition, reason=body.reason, user_id=user.id
    )
    return AssetResponse.model_validate(asset)


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
