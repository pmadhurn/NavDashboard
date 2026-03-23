from __future__ import annotations

import json
from math import ceil
from uuid import UUID

from sqlalchemy import func as sa_func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from modules.devices.models import Device
from modules.devices.schemas import DeviceResponse, DeviceUpdate
from modules.devices import repository as devices_repository
from modules.inventory import repository as inventory_repository
from modules.inventory.schemas import MaterialCreate, MaterialResponse
from modules.inventory.templates import (
    copy_materials_from_couple,
    create_materials_from_template,
)
from modules.locations import repository as locations_repository
from modules.locations.models import LocationHistory
from modules.locations.schemas import (
    LocationCreate,
    LocationHistoryResponse,
    LocationResponse,
    MapDataPoint,
)
from modules.locations.service import calculate_distance
from modules.personnel import repository as personnel_repository
from shared.audit import record_audit
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams
from shared.propagation import propagate_couple_status_change

from . import repository
from .models import Couple
from .schemas import (
    CoupleCreate,
    CoupleResponse,
    CoupleUpdate,
    LocationChangeRequest,
    MaterialCreateInline,
)

STATUS_COLORS: dict[str, str] = {
    "WORKING": "#5F8F6B",
    "NOT_WORKING": "#B68A3C",
    "FAULTY": "#9B3E3E",
}


def _get_status_color(status: str) -> str:
    return STATUS_COLORS.get(status, "#888888")


def _make_json_safe(data: dict) -> dict:
    """Convert UUID and other non-serializable types to strings for JSONB storage."""
    safe = {}
    for k, v in data.items():
        if isinstance(v, UUID):
            safe[k] = str(v)
        elif isinstance(v, dict):
            safe[k] = _make_json_safe(v)
        elif isinstance(v, list):
            safe[k] = [str(i) if isinstance(i, UUID) else i for i in v]
        else:
            safe[k] = v
    return safe


async def _build_couple_response(
    db: AsyncSession, couple: Couple
) -> CoupleResponse:
    devices_stmt = select(Device).where(
        Device.couple_id == couple.id, Device.deleted_at.is_(None)
    )
    devices_result = await db.execute(devices_stmt)
    devices = [
        DeviceResponse.model_validate(d, from_attributes=True)
        for d in devices_result.scalars().all()
    ]

    materials = await inventory_repository.get_by_couple(db, couple.id)
    material_responses = [
        MaterialResponse.model_validate(m, from_attributes=True)
        for m in materials
    ]

    location_resp: LocationResponse | None = None
    if couple.location:
        location_resp = LocationResponse.model_validate(
            couple.location, from_attributes=True
        )

    person_name: str | None = None
    if couple.handling_person:
        person_name = couple.handling_person.full_name

    return CoupleResponse(
        id=couple.id,
        name=couple.name,
        pair_id=couple.pair_id,
        has_rf=couple.has_rf,
        status=couple.status,
        status_color=_get_status_color(couple.status),
        handling_person_id=couple.handling_person_id,
        handling_person_name=person_name,
        location_id=couple.location_id,
        location=location_resp,
        devices=devices,
        materials=material_responses,
        configuration=couple.configuration,
        notes=couple.notes,
        custom_fields=couple.custom_fields,
        created_at=couple.created_at,
        updated_at=couple.updated_at,
    )


async def list_couples(
    db: AsyncSession,
    params: PaginationParams,
    filters: dict | None = None,
) -> PaginatedResponse[CoupleResponse]:
    query = select(Couple).where(Couple.deleted_at.is_(None))
    if filters:
        query = apply_filters(query, Couple, filters)
    query = query.order_by(Couple.created_at.desc())

    count_q = select(sa_func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar_one()

    offset = (params.page - 1) * params.size
    rows_q = query.offset(offset).limit(params.size)
    rows_result = await db.execute(rows_q)
    couples = list(rows_result.scalars().all())

    items = []
    for c in couples:
        items.append(await _build_couple_response(db, c))

    pages = ceil(total / params.size) if params.size > 0 else 0
    return PaginatedResponse(
        items=items, total=total, page=params.page, size=params.size, pages=pages
    )


async def get_couple(db: AsyncSession, couple_id: UUID) -> CoupleResponse:
    couple = await repository.get_by_id(db, couple_id)
    if not couple:
        raise NotFoundException("Couple not found")
    return await _build_couple_response(db, couple)


async def create_couple(
    db: AsyncSession, couple_in: CoupleCreate, user_id: UUID
) -> CoupleResponse:
    location_id = None
    if couple_in.location:
        location = await locations_repository.create(db, couple_in.location)
        location_id = location.id

    couple = await repository.create(
        db,
        {
            "name": couple_in.name,
            "pair_id": couple_in.pair_id,
            "has_rf": couple_in.has_rf,
            "status": couple_in.status,
            "handling_person_id": couple_in.handling_person_id,
            "location_id": location_id,
            "configuration": couple_in.configuration,
            "notes": couple_in.notes,
            "custom_fields": couple_in.custom_fields,
        },
    )

    if couple_in.device_ids:
        for device_id in couple_in.device_ids:
            device = await devices_repository.get_by_id(db, device_id)
            if device:
                if device.couple_id and device.couple_id != couple.id:
                    await devices_repository.update(
                        db, device_id, DeviceUpdate(couple_id=None)
                    )
                await devices_repository.update(
                    db, device_id, DeviceUpdate(couple_id=couple.id)
                )

    if couple_in.fitting_materials:
        for mat in couple_in.fitting_materials:
            await inventory_repository.create(
                db,
                MaterialCreate(
                    couple_id=couple.id,
                    name=mat.name,
                    quantity=mat.quantity,
                    unit=mat.unit,
                ),
            )

    if couple_in.copy_materials_from:
        await copy_materials_from_couple(
            db, couple_in.copy_materials_from, couple.id
        )

    if couple_in.template_id:
        await create_materials_from_template(db, couple_in.template_id, couple.id)

    await record_audit(
        db,
        action="CREATE",
        entity_type="couple",
        entity_id=couple.id,
        user_id=user_id,
        new_values=_make_json_safe({"name": couple.name, "status": couple.status}),
    )

    await db.refresh(couple)

    # Cascade status to pair if couple is assigned to one
    if couple.pair_id:
        await propagate_couple_status_change(db, couple)

    return await _build_couple_response(db, couple)


async def update_couple(
    db: AsyncSession, couple_id: UUID, couple_in: CoupleUpdate, user_id: UUID
) -> CoupleResponse:
    couple = await repository.get_by_id(db, couple_id)
    if not couple:
        raise NotFoundException("Couple not found")

    old_status = couple.status
    old_values = _make_json_safe({"name": couple.name, "status": couple.status})
    update_data = couple_in.model_dump(exclude_unset=True)

    updated = await repository.update(db, couple_id, update_data)
    if not updated:
        raise NotFoundException("Couple not found")

    # Cascade status change to pair
    if updated.status != old_status and updated.pair_id:
        await propagate_couple_status_change(db, updated)

    await record_audit(
        db,
        action="UPDATE",
        entity_type="couple",
        entity_id=couple_id,
        user_id=user_id,
        old_values=old_values,
        new_values=_make_json_safe(update_data),
    )

    return await _build_couple_response(db, updated)


async def delete_couple(
    db: AsyncSession, couple_id: UUID, user_id: UUID
) -> CoupleResponse:
    couple = await repository.get_by_id(db, couple_id)
    if not couple:
        raise NotFoundException("Couple not found")

    response = await _build_couple_response(db, couple)

    devices_stmt = select(Device).where(
        Device.couple_id == couple_id, Device.deleted_at.is_(None)
    )
    devices_result = await db.execute(devices_stmt)
    for device in devices_result.scalars().all():
        device.couple_id = None
    await db.flush()

    if couple.pair_id:
        couple.pair_id = None
        await db.flush()

    await repository.soft_delete(db, couple_id)

    await record_audit(
        db,
        action="DELETE",
        entity_type="couple",
        entity_id=couple_id,
        user_id=user_id,
        old_values=_make_json_safe({"name": couple.name}),
    )

    return response


async def change_couple_location(
    db: AsyncSession,
    couple_id: UUID,
    location_in: LocationChangeRequest,
    user_id: UUID,
) -> CoupleResponse:
    couple = await repository.get_by_id(db, couple_id)
    if not couple:
        raise NotFoundException("Couple not found")

    if couple.location_id and couple.location:
        old_lat = couple.location.latitude
        old_lng = couple.location.longitude

        materials = await inventory_repository.get_by_couple(db, couple.id)
        materials_snapshot = [
            {"name": m.name, "quantity": m.quantity, "unit": m.unit}
            for m in materials
        ]

        distance = calculate_distance(
            old_lat, old_lng, location_in.latitude, location_in.longitude
        )

        history = LocationHistory(
            couple_id=couple.id,
            old_latitude=old_lat,
            old_longitude=old_lng,
            new_latitude=location_in.latitude,
            new_longitude=location_in.longitude,
            handled_by=user_id,
            had_rf=couple.has_rf,
            distance_meters=round(distance, 2),
            fitting_materials_snapshot=materials_snapshot,
            configuration_snapshot=couple.configuration,
            notes=location_in.notes,
        )
        await locations_repository.create_history(db, history)

    new_location = await locations_repository.create(
        db,
        LocationCreate(
            latitude=location_in.latitude,
            longitude=location_in.longitude,
            address_note=location_in.address_note,
        ),
    )

    await repository.update(db, couple_id, {"location_id": new_location.id})

    await record_audit(
        db,
        action="LOCATION_CHANGE",
        entity_type="couple",
        entity_id=couple_id,
        user_id=user_id,
        new_values={
            "latitude": location_in.latitude,
            "longitude": location_in.longitude,
        },
    )

    updated_couple = await repository.get_by_id(db, couple_id)
    return await _build_couple_response(db, updated_couple)


async def get_couple_location_history(
    db: AsyncSession, couple_id: UUID, params: PaginationParams
) -> PaginatedResponse[LocationHistoryResponse]:
    from modules.locations.service import get_location_history_for_couple

    return await get_location_history_for_couple(db, couple_id, params)


async def get_couple_map_data(db: AsyncSession) -> list[MapDataPoint]:
    data = await repository.get_map_data(db)
    return [MapDataPoint(**d) for d in data]


async def seed_couples(
    db: AsyncSession, user_id: UUID
) -> list[CoupleResponse]:
    count = await repository.count_all(db)
    if count > 0:
        return []

    async def get_device_by_serial(serial: str) -> Device | None:
        return await devices_repository.find_by_serial(db, serial)

    from modules.personnel.models import Person

    personnel_stmt = (
        select(Person)
        .where(Person.deleted_at.is_(None))
        .order_by(Person.created_at)
        .limit(6)
    )
    personnel_result = await db.execute(personnel_stmt)
    personnel = list(personnel_result.scalars().all())
    person_ids = [p.id for p in personnel]

    templates = await inventory_repository.get_templates(db)
    rooftop_template_id = None
    for t in templates:
        if t.template_name == "Standard Rooftop Kit":
            rooftop_template_id = t.id
            break

    seed_configs = [
        {
            "name": "Couple A1",
            "status": "WORKING",
            "has_rf": False,
            "lat": 48.8566,
            "lng": 2.3522,
            "address": "Paris Office Rooftop",
            "serials": ["IU-00001", "OU-00001", "HC-00001"],
            "template_id": rooftop_template_id,
            "materials": None,
            "person_idx": 0,
        },
        {
            "name": "Couple A2",
            "status": "WORKING",
            "has_rf": True,
            "lat": 48.8606,
            "lng": 2.3376,
            "address": "Louvre Building North",
            "serials": ["IU-00002", "OU-00002", "HC-00002", "RF-00001"],
            "template_id": rooftop_template_id,
            "materials": None,
            "person_idx": 1,
        },
        {
            "name": "Couple B1",
            "status": "NOT_WORKING",
            "has_rf": False,
            "lat": 48.8530,
            "lng": 2.3499,
            "address": "Seine Tower South",
            "serials": ["IU-00003", "OU-00003"],
            "template_id": None,
            "materials": [
                {"name": "Mounting Bracket", "quantity": 1, "unit": "pcs"},
                {"name": "Ethernet Cable Cat6", "quantity": 2, "unit": "pcs"},
            ],
            "person_idx": 2,
        },
        {
            "name": "Couple B2",
            "status": "FAULTY",
            "has_rf": True,
            "lat": 48.8490,
            "lng": 2.3470,
            "address": "Latin Quarter Hub",
            "serials": ["RF-00002"],
            "template_id": None,
            "materials": None,
            "person_idx": 3,
        },
    ]

    results: list[CoupleResponse] = []
    for cfg in seed_configs:
        device_ids: list[UUID] = []
        for serial in cfg["serials"]:
            dev = await get_device_by_serial(serial)
            if dev:
                device_ids.append(dev.id)

        person_id = (
            person_ids[cfg["person_idx"]]
            if cfg["person_idx"] < len(person_ids)
            else None
        )

        inline_materials = None
        if cfg["materials"]:
            inline_materials = [
                MaterialCreateInline(**m) for m in cfg["materials"]
            ]

        couple_in = CoupleCreate(
            name=cfg["name"],
            status=cfg["status"],
            has_rf=cfg["has_rf"],
            handling_person_id=person_id,
            location=LocationCreate(
                latitude=cfg["lat"],
                longitude=cfg["lng"],
                address_note=cfg["address"],
            ),
            device_ids=device_ids,
            fitting_materials=inline_materials,
            template_id=cfg["template_id"],
        )

        couple_resp = await create_couple(db, couple_in, user_id)
        results.append(couple_resp)

    return results