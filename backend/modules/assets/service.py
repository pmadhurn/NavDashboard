from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.assets.models import Asset, AssetCategory, AssetHistory, AssetReport
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
)
from shared.audit import record_audit
from shared.pagination import PaginatedResponse, PaginationParams, paginate

VALID_STATUSES = {"IN_OFFICE", "WITH_PROJECT", "WITH_PERSON", "DAMAGED", "LOST", "RETIRED"}
DEVICE_CATEGORY_NAME = "LiFi Devices"
VALID_KINDS = {"SERIALIZED", "BULK"}
VALID_REPORT_TYPES = {"DAMAGED", "REQUIREMENT"}
VALID_REPORT_STATUSES = {"OPEN", "ORDERED", "RESOLVED"}


async def _next_asset_code(db: AsyncSession) -> str:
    """Generate sequential human-readable codes: AST-00001, AST-00002, ..."""
    stmt = select(func.count()).select_from(Asset)
    count = (await db.execute(stmt)).scalar_one()
    for offset in range(count + 1, count + 1000):
        code = f"AST-{offset:05d}"
        exists = await db.execute(select(Asset.id).where(Asset.asset_code == code))
        if exists.scalar_one_or_none() is None:
            return code
    raise ConflictException("Could not generate a unique asset code")


async def record_asset_event(
    db: AsyncSession,
    asset_id: UUID,
    event_type: str,
    performed_by: Optional[UUID],
    old_status: Optional[str] = None,
    new_status: Optional[str] = None,
    project_id: Optional[UUID] = None,
    person_id: Optional[UUID] = None,
    note: Optional[str] = None,
    commit: bool = True,
) -> None:
    db.add(
        AssetHistory(
            asset_id=asset_id,
            event_type=event_type,
            old_status=old_status,
            new_status=new_status,
            project_id=project_id,
            person_id=person_id,
            note=note,
            performed_by=performed_by,
        )
    )
    if commit:
        await db.commit()


# --- Device ↔ Asset mirror ---

async def _get_or_create_device_category(db: AsyncSession) -> AssetCategory:
    stmt = select(AssetCategory).where(
        func.lower(AssetCategory.name) == DEVICE_CATEGORY_NAME.lower()
    )
    cat = (await db.execute(stmt)).scalar_one_or_none()
    if not cat:
        cat = AssetCategory(name=DEVICE_CATEGORY_NAME, sort_order=0)
        db.add(cat)
        await db.commit()
        await db.refresh(cat)
    return cat


async def sync_device_asset(db: AsyncSession, device) -> None:
    """Keep a mirror Asset row for a Device so every device shows up in unified
    inventory. Custody status (IN_OFFICE / WITH_PROJECT / …) is NOT derived from
    device health — it is managed by equipment movements / deployments. Only
    descriptive fields are synced. Soft-deletes the mirror when the device is
    soft-deleted; revives it if the device is restored."""
    stmt = select(Asset).where(Asset.device_id == device.id)
    asset = (await db.execute(stmt)).scalar_one_or_none()

    # Device removed → soft-delete its mirror
    if getattr(device, "deleted_at", None) is not None:
        if asset and asset.deleted_at is None:
            asset.deleted_at = datetime.now(timezone.utc)
            await db.commit()
        return

    name = f"{device.device_type} {device.serial_number}".strip()

    if asset is None:
        category = await _get_or_create_device_category(db)
        code = (device.serial_number or "")[:50] or await _next_asset_code(db)
        clash = await db.execute(
            select(Asset.id).where(Asset.asset_code == code, Asset.deleted_at.is_(None))
        )
        if clash.scalar_one_or_none():
            code = await _next_asset_code(db)
        asset = Asset(
            asset_code=code,
            name=name,
            category_id=category.id,
            item_kind="SERIALIZED",
            serial_number=device.serial_number,
            quantity=1,
            status="IN_OFFICE",
            device_id=device.id,
        )
        db.add(asset)
        await db.commit()
    else:
        if asset.deleted_at is not None:
            asset.deleted_at = None  # revive
        asset.name = name
        asset.serial_number = device.serial_number
        asset.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def backfill_device_assets(db: AsyncSession) -> dict:
    """Create mirror assets for any devices that don't have one yet (idempotent)."""
    from modules.devices.models import Device

    devices = (
        await db.execute(select(Device).where(Device.deleted_at.is_(None)))
    ).scalars().all()
    created = 0
    for device in devices:
        existing = (
            await db.execute(select(Asset).where(Asset.device_id == device.id))
        ).scalar_one_or_none()
        if existing is None:
            await sync_device_asset(db, device)
            created += 1
    return {"synced": created, "total_devices": len(devices)}


# --- Categories ---

async def list_categories(db: AsyncSession) -> list[AssetCategoryResponse]:
    stmt = select(AssetCategory).order_by(AssetCategory.sort_order, AssetCategory.name)
    result = await db.execute(stmt)
    return [AssetCategoryResponse.model_validate(c) for c in result.scalars().all()]


async def create_category(db: AsyncSession, body: AssetCategoryCreate) -> AssetCategoryResponse:
    stmt = select(AssetCategory).where(
        func.lower(AssetCategory.name) == body.name.lower(),
        AssetCategory.parent_id == body.parent_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        return AssetCategoryResponse.model_validate(existing)
    category = AssetCategory(
        name=body.name, parent_id=body.parent_id, sort_order=body.sort_order
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return AssetCategoryResponse.model_validate(category)


async def delete_category(db: AsyncSession, category_id: UUID) -> None:
    category = await db.get(AssetCategory, category_id)
    if not category:
        raise NotFoundException("Category not found")
    stmt = select(Asset).where(Asset.category_id == category_id)
    for asset in (await db.execute(stmt)).scalars().all():
        asset.category_id = None
    stmt = select(AssetCategory).where(AssetCategory.parent_id == category_id)
    for child in (await db.execute(stmt)).scalars().all():
        child.parent_id = category.parent_id
    await db.delete(category)
    await db.commit()


# --- Assets ---

async def list_assets(
    db: AsyncSession,
    params: PaginationParams,
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    status: Optional[str] = None,
    project_id: Optional[UUID] = None,
    source: Optional[str] = None,  # 'device' | 'equipment' (non-device)
    custody_type: Optional[str] = None,
    condition: Optional[str] = None,
    location_id: Optional[UUID] = None,
    person_id: Optional[UUID] = None,
    available: Optional[bool] = None,
) -> PaginatedResponse[AssetResponse]:
    stmt = select(Asset).where(Asset.deleted_at.is_(None))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Asset.name.ilike(like),
                Asset.asset_code.ilike(like),
                Asset.serial_number.ilike(like),
            )
        )
    if category_id:
        stmt = stmt.where(Asset.category_id == category_id)
    if status:
        stmt = stmt.where(Asset.status == status)
    if project_id:
        stmt = stmt.where(Asset.current_project_id == project_id)
    if source == "device":
        stmt = stmt.where(Asset.device_id.isnot(None))
    elif source == "equipment":
        stmt = stmt.where(Asset.device_id.is_(None))
    stmt = stmt.order_by(Asset.created_at.desc())

    # Custody / condition filters (Phase 1). `status` is kept for one release
    # but these are the ones that mean anything.
    if custody_type:
        stmt = stmt.where(Asset.custody_type == custody_type)
    if condition:
        stmt = stmt.where(Asset.condition == condition)
    if location_id:
        stmt = stmt.where(
            Asset.custody_type == "LOCATION", Asset.custody_id == location_id
        )
    if person_id:
        stmt = stmt.where(
            Asset.custody_type == "PERSON", Asset.custody_id == person_id
        )
    if available is True:
        stmt = stmt.where(Asset.custody_type == "LOCATION", Asset.condition == "OK")
    elif available is False:
        stmt = stmt.where(
            or_(Asset.custody_type != "LOCATION", Asset.condition != "OK")
        )

    from modules.assets import custody_service

    page = await paginate(db, stmt, params, AssetResponse)
    await custody_service.enrich(db, page.items)
    return page


async def get_deployed(db: AsyncSession) -> list:
    """Everything currently out at project sites — assets WITH_PROJECT plus
    explicit project_deployments — grouped by project."""
    from modules.assets.schemas import DeployedGroup, DeployedItem
    from modules.projects.models import Project, ProjectDeployment
    from modules.projects.service import _resolve_entity_label

    groups: dict = {}

    def _ensure(pid, name):
        key = str(pid) if pid else "unassigned"
        if key not in groups:
            groups[key] = {"project_id": pid, "project_name": name or "Unassigned", "items": []}
        return groups[key]

    # Assets currently WITH_PROJECT
    stmt = select(Asset).where(
        Asset.deleted_at.is_(None), Asset.status == "WITH_PROJECT"
    )
    for a in (await db.execute(stmt)).scalars().all():
        project = await db.get(Project, a.current_project_id) if a.current_project_id else None
        g = _ensure(a.current_project_id, project.name if project else None)
        g["items"].append(
            DeployedItem(
                type="device" if a.device_id else "asset",
                id=a.id,
                label=f"{a.asset_code} {a.name}",
                status=a.status,
                custody=str(a.current_person_id) if a.current_person_id else None,
            )
        )

    # Explicit deployments (couples/pairs/devices linked to a project)
    stmt = select(ProjectDeployment).where(ProjectDeployment.removed_at.is_(None))
    for dep in (await db.execute(stmt)).scalars().all():
        project = await db.get(Project, dep.project_id)
        g = _ensure(dep.project_id, project.name if project else None)
        label, sub = await _resolve_entity_label(db, dep.entity_type, dep.entity_id)
        g["items"].append(
            DeployedItem(
                type=dep.entity_type,
                id=dep.entity_id,
                label=label or str(dep.entity_id),
                status=sub,
            )
        )

    return [DeployedGroup(**g) for g in groups.values() if g["items"]]


async def quick_create_asset(
    db: AsyncSession, name: str, quantity: int, user_id: UUID
) -> Asset:
    """Create a minimal asset on the fly (used by the outward form when an item
    isn't in inventory yet — record-keeping starts from that day)."""
    code = await _next_asset_code(db)
    kind = "BULK" if (quantity or 1) > 1 else "SERIALIZED"
    asset = Asset(
        asset_code=code,
        name=name[:300],
        item_kind=kind,
        quantity=quantity or 1,
        status="IN_OFFICE",
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    await record_asset_event(
        db, asset.id, "CREATED", user_id, new_status="IN_OFFICE",
        note="created via outward form",
    )
    return asset


async def available_quantity(db: AsyncSession, asset: Asset) -> int:
    """How many of this asset are currently free to issue.

    Serialized: 1 if in the office, else 0. Bulk: total owned minus the quantity
    currently out with clients (open outward movement items)."""
    if asset.item_kind == "SERIALIZED":
        return 1 if asset.status == "IN_OFFICE" else 0
    from modules.projects.models import EquipmentMovementItem

    stmt = select(func.coalesce(func.sum(EquipmentMovementItem.quantity), 0)).where(
        EquipmentMovementItem.asset_id == asset.id,
        EquipmentMovementItem.item_status == "WITH_CLIENT",
    )
    out = int((await db.execute(stmt)).scalar_one() or 0)
    return (asset.quantity or 0) - out


async def adjust_stock(
    db: AsyncSession, asset: Asset, new_total: int, user_id: UUID, note: str
) -> None:
    """Raise an asset's recorded total (over-issue reconciliation) and log it."""
    old = asset.quantity or 0
    if new_total <= old:
        return
    asset.quantity = new_total
    await db.commit()
    await record_asset_event(
        db,
        asset.id,
        "ADJUSTMENT",
        user_id,
        note=f"{note} (stock {old}→{new_total})",
    )


async def get_asset(db: AsyncSession, asset_id: UUID) -> Asset:
    stmt = select(Asset).where(Asset.id == asset_id, Asset.deleted_at.is_(None))
    asset = (await db.execute(stmt)).scalar_one_or_none()
    if not asset:
        raise NotFoundException("Asset not found")
    return asset


async def lookup_by_code(db: AsyncSession, code: str) -> AssetResponse:
    """Find an asset by its code or any tag identifier (future scan endpoint)."""
    stmt = select(Asset).where(Asset.deleted_at.is_(None), Asset.asset_code == code)
    asset = (await db.execute(stmt)).scalar_one_or_none()
    if not asset:
        stmt = select(Asset).where(
            Asset.deleted_at.is_(None),
            or_(
                Asset.serial_number == code,
                Asset.tag_identifiers["barcode"].astext == code,
                Asset.tag_identifiers["qr"].astext == code,
                Asset.tag_identifiers["rfid"].astext == code,
            ),
        )
        asset = (await db.execute(stmt)).scalars().first()
    if not asset:
        raise NotFoundException(f"No asset found for code '{code}'")
    return AssetResponse.model_validate(asset)


async def create_asset(db: AsyncSession, body: AssetCreate, user_id: UUID) -> AssetResponse:
    if body.item_kind not in VALID_KINDS:
        raise BadRequestException(f"item_kind must be one of {sorted(VALID_KINDS)}")
    if body.status not in VALID_STATUSES:
        raise BadRequestException(f"status must be one of {sorted(VALID_STATUSES)}")

    code = (body.asset_code or "").strip() or await _next_asset_code(db)
    exists = await db.execute(
        select(Asset.id).where(Asset.asset_code == code, Asset.deleted_at.is_(None))
    )
    if exists.scalar_one_or_none():
        raise ConflictException(f"Asset code '{code}' already exists")

    asset = Asset(
        asset_code=code,
        name=body.name,
        category_id=body.category_id,
        item_kind=body.item_kind,
        serial_number=body.serial_number,
        quantity=body.quantity,
        status=body.status,
        current_person_id=body.current_person_id,
        device_id=body.device_id,
        purchase_date=body.purchase_date,
        purchase_price=body.purchase_price,
        notes=body.notes,
        tags=body.tags,
        tag_identifiers=body.tag_identifiers,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    await record_asset_event(
        db, asset.id, "CREATED", user_id, new_status=asset.status, commit=False
    )
    await record_audit(
        db,
        action="CREATE",
        entity_type="asset",
        entity_id=asset.id,
        user_id=user_id,
        new_values={"asset_code": code, "name": asset.name},
    )
    return AssetResponse.model_validate(asset)


async def update_asset(
    db: AsyncSession, asset_id: UUID, body: AssetUpdate, user_id: UUID
) -> AssetResponse:
    asset = await get_asset(db, asset_id)

    if body.status and body.status not in VALID_STATUSES:
        raise BadRequestException(f"status must be one of {sorted(VALID_STATUSES)}")
    if body.item_kind and body.item_kind not in VALID_KINDS:
        raise BadRequestException(f"item_kind must be one of {sorted(VALID_KINDS)}")

    old_status = asset.status
    status_note = body.status_note
    update_data = body.model_dump(exclude_unset=True, exclude={"status_note"})
    for field, value in update_data.items():
        setattr(asset, field, value)
    asset.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(asset)

    if body.status and body.status != old_status:
        await record_asset_event(
            db,
            asset.id,
            "STATUS_CHANGE",
            user_id,
            old_status=old_status,
            new_status=body.status,
            project_id=asset.current_project_id,
            person_id=asset.current_person_id,
            note=status_note,
        )

    await record_audit(
        db,
        action="UPDATE",
        entity_type="asset",
        entity_id=asset.id,
        user_id=user_id,
        new_values={k: str(v) for k, v in update_data.items()},
    )
    return AssetResponse.model_validate(asset)


async def delete_asset(db: AsyncSession, asset_id: UUID, user_id: UUID) -> None:
    asset = await get_asset(db, asset_id)
    asset.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await record_audit(
        db,
        action="DELETE",
        entity_type="asset",
        entity_id=asset.id,
        user_id=user_id,
        old_values={"asset_code": asset.asset_code, "name": asset.name},
    )


async def get_asset_history(db: AsyncSession, asset_id: UUID) -> list[AssetHistoryResponse]:
    await get_asset(db, asset_id)
    stmt = (
        select(AssetHistory)
        .where(AssetHistory.asset_id == asset_id)
        .order_by(AssetHistory.occurred_at.desc())
    )
    result = await db.execute(stmt)
    return [AssetHistoryResponse.model_validate(h) for h in result.scalars().all()]


# --- Reports (damaged / requirements) ---

async def list_reports(
    db: AsyncSession,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
) -> list[AssetReportResponse]:
    stmt = select(AssetReport).where(AssetReport.deleted_at.is_(None))
    if report_type:
        stmt = stmt.where(AssetReport.report_type == report_type)
    if status:
        stmt = stmt.where(AssetReport.status == status)
    stmt = stmt.order_by(AssetReport.created_at.desc())
    result = await db.execute(stmt)
    return [AssetReportResponse.model_validate(r) for r in result.scalars().all()]


async def create_report(
    db: AsyncSession, body: AssetReportCreate, user_id: UUID
) -> AssetReportResponse:
    if body.report_type not in VALID_REPORT_TYPES:
        raise BadRequestException(f"report_type must be one of {sorted(VALID_REPORT_TYPES)}")

    report = AssetReport(
        report_type=body.report_type,
        asset_id=body.asset_id,
        title=body.title,
        details=body.details,
        quantity=body.quantity,
        reported_by=user_id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    # A damage report flips the asset status and records history
    if body.report_type == "DAMAGED" and body.asset_id:
        asset = await get_asset(db, body.asset_id)
        if asset.status != "DAMAGED":
            old_status = asset.status
            asset.status = "DAMAGED"
            await db.commit()
            await record_asset_event(
                db,
                asset.id,
                "DAMAGED_REPORTED",
                user_id,
                old_status=old_status,
                new_status="DAMAGED",
                note=body.title,
            )

    await record_audit(
        db,
        action="CREATE",
        entity_type="asset_report",
        entity_id=report.id,
        user_id=user_id,
        new_values={"type": body.report_type, "title": body.title},
    )
    return AssetReportResponse.model_validate(report)


async def update_report(
    db: AsyncSession, report_id: UUID, body: AssetReportUpdate, user_id: UUID
) -> AssetReportResponse:
    report = await db.get(AssetReport, report_id)
    if not report or report.deleted_at is not None:
        raise NotFoundException("Report not found")

    if body.status:
        if body.status not in VALID_REPORT_STATUSES:
            raise BadRequestException(
                f"status must be one of {sorted(VALID_REPORT_STATUSES)}"
            )
        report.status = body.status
        if body.status == "RESOLVED":
            report.resolved_at = datetime.now(timezone.utc)
    if body.details is not None:
        report.details = body.details
    if body.quantity is not None:
        report.quantity = body.quantity
    await db.commit()
    await db.refresh(report)
    return AssetReportResponse.model_validate(report)
