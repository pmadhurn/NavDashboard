import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.assets import custody_service, movement_service, service
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
    BundleCreate,
    BundleResponse,
    BundleUpdate,
    CompleteRepair,
    CustodySummary,
    DamageReport,
    DeployedGroup,
    HandoverCreate,
    HandoverRespond,
    HandoverResponse,
    MoveCustodyRequest,
    PartyCreate,
    PartyResponse,
    RepairResponse,
    ResolveBatchRequest,
    SendForRepair,
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
    project_id: Optional[UUID] = Query(None),
    source: Optional[str] = Query(None),
    custody_type: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    location_id: Optional[UUID] = Query(None),
    person_id: Optional[UUID] = Query(None),
    available: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_assets(
        db,
        PaginationParams(page=page, size=size),
        search=search,
        category_id=category_id,
        project_id=project_id,
        source=source,
        custody_type=custody_type,
        condition=condition,
        location_id=location_id,
        person_id=person_id,
        available=available,
    )


# Registered above `/{asset_id}`: FastAPI matches in declaration order, and
# below it "export" would be parsed as an id and 422 instead.
@router.get("/export")
async def export_assets(
    format: str = Query("xlsx", pattern="^(xlsx|csv|pdf)$"),
    custody_type: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The inventory register as a workbook, a CSV, or a printable PDF."""
    payload, media_type, filename = await service.export_assets(
        db, format, custody_type=custody_type, condition=condition
    )
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
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
    await custody_service.enrich(db, [asset])
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
    await custody_service.enrich(db, [asset])
    return AssetResponse.model_validate(asset)


# --- movement: handover, kits, returns, repairs (Phase 2) -------------------


@router.get("/handovers", response_model=list[HandoverResponse])
async def list_handovers(
    person_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await movement_service.list_handovers(db, person_id=person_id, status=status)


@router.post("/handovers", response_model=HandoverResponse, status_code=201)
async def create_handover(
    body: HandoverCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Offer items to someone. Custody does NOT move until they accept."""
    h = await movement_service.create_handover(
        db, from_person_id=body.from_person_id, to_person_id=body.to_person_id,
        asset_ids=body.asset_ids, note=body.note, user_id=user.id,
    )
    rows = await movement_service.list_handovers(db, person_id=body.to_person_id)
    return next(r for r in rows if r["id"] == h.id)


@router.post("/handovers/{handover_id}/respond", response_model=HandoverResponse)
async def respond_to_handover(
    handover_id: UUID,
    body: HandoverRespond,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    h = await movement_service.respond_to_handover(
        db, handover_id, accept=body.accept, note=body.note, user_id=user.id
    )
    rows = await movement_service.list_handovers(db, person_id=h.to_person_id)
    return next(r for r in rows if r["id"] == h.id)


@router.post("/handovers/{handover_id}/cancel", response_model=HandoverResponse)
async def cancel_handover(
    handover_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    h = await movement_service.cancel_handover(db, handover_id, user.id)
    rows = await movement_service.list_handovers(db, person_id=h.from_person_id)
    return next(r for r in rows if r["id"] == h.id)


@router.get("/bundles", response_model=list[BundleResponse])
async def list_bundles(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await movement_service.list_bundles(db)


@router.post("/bundles", response_model=BundleResponse, status_code=201)
async def create_bundle(
    body: BundleCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    b = await movement_service.create_bundle(
        db, name=body.name, description=body.description,
        asset_ids=body.asset_ids, user_id=user.id,
    )
    return next(x for x in await movement_service.list_bundles(db) if x["id"] == b.id)


@router.put("/bundles/{bundle_id}", response_model=BundleResponse)
async def update_bundle(
    bundle_id: UUID,
    body: BundleUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await movement_service.update_bundle(
        db, bundle_id, name=body.name, description=body.description,
        asset_ids=body.asset_ids, user_id=user.id,
    )
    return next(x for x in await movement_service.list_bundles(db) if x["id"] == bundle_id)


@router.delete("/bundles/{bundle_id}", status_code=204)
async def delete_bundle(
    bundle_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    await movement_service.delete_bundle(db, bundle_id, user.id)


@router.post("/returns/resolve")
async def resolve_returns(
    body: ResolveBatchRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Say what happened to each item that went out.

    Ten out and seven back is never "three missing" — every item is resolved
    explicitly, and every outcome puts it somewhere real.
    """
    for item in body.items:
        await movement_service.resolve_item(
            db, asset_id=item.asset_id, outcome=item.outcome, note=item.note,
            project_id=item.project_id, customer_id=item.customer_id,
            site_location_id=item.site_location_id,
            responsible_person_id=item.responsible_person_id,
            expected_return_date=item.expected_return_date,
            user_id=user.id, commit=False,
        )
    await db.commit()
    return {"resolved": len(body.items)}


@router.get("/repairs", response_model=list[RepairResponse])
async def list_repairs(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await movement_service.list_repairs(db, status=status)


@router.post("/repairs", response_model=RepairResponse, status_code=201)
async def report_damage(
    body: DamageReport,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    r = await movement_service.report_damage(
        db, asset_id=body.asset_id, details=body.details,
        damage_location=body.damage_location,
        responsible_person_id=body.responsible_person_id,
        project_id=body.project_id, damaged_at=body.damaged_at, user_id=user.id,
    )
    return next(x for x in await movement_service.list_repairs(db) if x["id"] == r.id)


@router.post("/repairs/{repair_id}/send", response_model=RepairResponse)
async def send_for_repair(
    repair_id: UUID,
    body: SendForRepair,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    r = await movement_service.send_for_repair(
        db, repair_id, vendor_id=body.vendor_id, cost=body.cost,
        note=body.note, user_id=user.id,
    )
    return next(x for x in await movement_service.list_repairs(db) if x["id"] == r.id)


@router.post("/repairs/{repair_id}/complete", response_model=RepairResponse)
async def complete_repair(
    repair_id: UUID,
    body: CompleteRepair,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    r = await movement_service.complete_repair(
        db, repair_id, repaired=body.repaired, cost=body.cost, note=body.note,
        return_location_id=body.return_location_id, user_id=user.id,
    )
    return next(x for x in await movement_service.list_repairs(db) if x["id"] == r.id)


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = await service.get_asset(db, asset_id)
    await custody_service.enrich(db, [asset])
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
