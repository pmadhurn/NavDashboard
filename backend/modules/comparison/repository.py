from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional

from modules.couples.models import Couple
from modules.pairs.models import Pair
from modules.devices.models import Device
from modules.personnel.models import Person
from modules.locations.models import Location
from modules.inventory.models import FittingMaterial


async def get_couple_full(db: AsyncSession, couple_id: UUID) -> Optional[dict]:
    result = await db.execute(
        select(Couple).where(Couple.id == couple_id, Couple.deleted_at.is_(None))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        return None

    data = {
        "id": couple.id,
        "name": couple.name,
        "status": couple.status,
        "has_rf": couple.has_rf,
        "notes": couple.notes,
        "configuration": couple.configuration,
        "handling_person_id": couple.handling_person_id,
        "handling_person_name": None,
        "location_id": couple.location_id,
        "latitude": None,
        "longitude": None,
        "custom_fields": couple.custom_fields,
    }

    if couple.handling_person_id:
        person_result = await db.execute(
            select(Person).where(Person.id == couple.handling_person_id)
        )
        person = person_result.scalar_one_or_none()
        if person:
            data["handling_person_name"] = person.full_name

    if couple.location_id:
        loc_result = await db.execute(
            select(Location).where(Location.id == couple.location_id)
        )
        loc = loc_result.scalar_one_or_none()
        if loc:
            data["latitude"] = loc.latitude
            data["longitude"] = loc.longitude

    devices_result = await db.execute(
        select(Device).where(Device.couple_id == couple_id, Device.deleted_at.is_(None))
    )
    devices = devices_result.scalars().all()
    data["devices"] = [
        {
            "serial_number": d.serial_number,
            "device_type": d.device_type,
            "status": d.status,
        }
        for d in devices
    ]

    materials_result = await db.execute(
        select(FittingMaterial).where(
            FittingMaterial.couple_id == couple_id,
            FittingMaterial.deleted_at.is_(None),
        )
    )
    materials = materials_result.scalars().all()
    data["fitting_materials"] = [
        {
            "name": m.name,
            "quantity": m.quantity,
            "unit": m.unit,
        }
        for m in materials
    ]

    return data


async def get_pair_full(db: AsyncSession, pair_id: UUID) -> Optional[dict]:
    result = await db.execute(
        select(Pair).where(Pair.id == pair_id, Pair.deleted_at.is_(None))
    )
    pair = result.scalar_one_or_none()
    if not pair:
        return None

    data = {
        "id": pair.id,
        "name": pair.name,
        "status": pair.status,
        "status_override": pair.status_override,
        "notes": pair.notes,
        "handling_person_id": pair.handling_person_id,
        "handling_person_name": None,
        "custom_fields": pair.custom_fields,
    }

    if pair.handling_person_id:
        person_result = await db.execute(
            select(Person).where(Person.id == pair.handling_person_id)
        )
        person = person_result.scalar_one_or_none()
        if person:
            data["handling_person_name"] = person.full_name

    couples_result = await db.execute(
        select(Couple).where(Couple.pair_id == pair_id, Couple.deleted_at.is_(None))
    )
    couples = couples_result.scalars().all()
    data["couples"] = [
        {
            "name": c.name,
            "status": c.status,
            "has_rf": c.has_rf,
        }
        for c in couples
    ]

    return data


async def get_device_full(db: AsyncSession, device_id: UUID) -> Optional[dict]:
    result = await db.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device = result.scalar_one_or_none()
    if not device:
        return None

    data = {
        "id": device.id,
        "serial_number": device.serial_number,
        "device_type": device.device_type,
        "status": device.status,
        "notes": device.notes,
        "couple_id": device.couple_id,
        "couple_name": None,
        "handling_person_id": device.handling_person_id,
        "handling_person_name": None,
        "custom_fields": device.custom_fields,
        "metadata_json": device.metadata_json,
    }

    if device.couple_id:
        couple_result = await db.execute(
            select(Couple).where(Couple.id == device.couple_id)
        )
        couple = couple_result.scalar_one_or_none()
        if couple:
            data["couple_name"] = couple.name

    if device.handling_person_id:
        person_result = await db.execute(
            select(Person).where(Person.id == device.handling_person_id)
        )
        person = person_result.scalar_one_or_none()
        if person:
            data["handling_person_name"] = person.full_name

    return data