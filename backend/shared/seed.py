"""
NavDashboard Seed Script
Creates demo data for development and testing.
Safe to run multiple times - checks for existing data.

Usage:
  docker compose exec backend python -m shared.seed
"""
import asyncio
import sys
import os
import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

# Add parent dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session_factory
from core.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

# ──────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────


async def _count(db: AsyncSession, table_name: str) -> int:
    result = await db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
    return result.scalar_one()


# ──────────────────────────────────────────────────────────────────
# Seed functions
# ──────────────────────────────────────────────────────────────────


async def seed_users(db: AsyncSession) -> dict:
    """Create demo users (tech + viewer). Skip if > 1 user already exists."""
    from modules.auth.models import User

    count = await _count(db, "users")
    if count > 1:
        print(f"⏭️  Skipping users ({count} already exist)")
        return {}

    users_data = [
        {
            "email": "tech1@navdashboard.com",
            "username": "tech1",
            "hashed_password": hash_password("tech123"),
            "full_name": "Sarah Chen",
            "role": "TECHNICIAN",
        },
        {
            "email": "viewer1@navdashboard.com",
            "username": "viewer1",
            "hashed_password": hash_password("viewer123"),
            "full_name": "James Wilson",
            "role": "VIEWER",
        },
    ]

    created = []
    for data in users_data:
        user = User(**data)
        db.add(user)
        created.append(data["username"])

    await db.commit()
    print(f"✅ Created {len(created)} users ({', '.join(created)})")
    return {"users": created}


async def seed_personnel(db: AsyncSession) -> dict:
    """Create demo personnel."""
    from modules.personnel.models import Person

    count = await _count(db, "personnel")
    if count > 0:
        print(f"⏭️  Skipping personnel ({count} already exist)")
        return {}

    personnel_data = [
        {"full_name": "Ahmed Al-Rashid", "role": "Technician", "email": "ahmed@example.com", "phone": "+33612345001"},
        {"full_name": "Maria Santos", "role": "Installer", "email": "maria@example.com", "phone": "+33612345002"},
        {"full_name": "James Chen", "role": "Manager", "email": "james.c@example.com", "phone": "+33612345003"},
        {"full_name": "Fatima Noor", "role": "Technician", "email": "fatima@example.com", "phone": "+33612345004"},
        {"full_name": "Lars Eriksson", "role": "Field Engineer", "email": "lars@example.com", "phone": "+33612345005"},
        {"full_name": "Priya Patel", "role": "Senior Technician", "email": "priya@example.com", "phone": "+33612345006"},
    ]

    ids = {}
    for data in personnel_data:
        person = Person(**data)
        db.add(person)
        await db.flush()
        ids[data["full_name"]] = person.id

    await db.commit()
    print(f"✅ Created {len(personnel_data)} personnel")
    return {"personnel_ids": ids}


async def seed_devices(db: AsyncSession) -> dict:
    """Create 12 demo devices."""
    from modules.devices.models import Device

    count = await _count(db, "devices")
    if count > 0:
        print(f"⏭️  Skipping devices ({count} already exist)")
        return {}

    devices_data = [
        # Indoor Units
        {"serial_number": "IU-001", "device_type": "IU", "status": "WORKING", "notes": "Indoor unit - Office Block A"},
        {"serial_number": "IU-002", "device_type": "IU", "status": "WORKING", "notes": "Indoor unit - Office Block B"},
        {"serial_number": "IU-003", "device_type": "IU", "status": "WORKING", "notes": "Indoor unit - Office Block C"},
        # Outdoor Units
        {"serial_number": "OU-001", "device_type": "OU", "status": "WORKING", "notes": "Outdoor unit - Rooftop A"},
        {"serial_number": "OU-002", "device_type": "OU", "status": "NOT_WORKING", "notes": "Outdoor unit - Rooftop B"},
        {"serial_number": "OU-003", "device_type": "OU", "status": "FAULTY", "notes": "Outdoor unit - Rooftop C, hardware fault"},
        # Hybrid Cables
        {"serial_number": "HC-001", "device_type": "HC", "status": "WORKING", "notes": "Hybrid cable - Link A"},
        {"serial_number": "HC-002", "device_type": "HC", "status": "WORKING", "notes": "Hybrid cable - Link B"},
        {"serial_number": "HC-003", "device_type": "HC", "status": "WORKING", "notes": "Hybrid cable - Link C"},
        # RF Listeners
        {"serial_number": "RF-001", "device_type": "RF", "status": "WORKING", "notes": "RF listener - Site A"},
        {"serial_number": "RF-002", "device_type": "RF", "status": "NOT_WORKING", "notes": "RF listener - Site B"},
        {"serial_number": "RF-003", "device_type": "RF", "status": "WORKING", "notes": "RF listener - Site C"},
    ]

    ids = {}
    for data in devices_data:
        device = Device(**data)
        db.add(device)
        await db.flush()
        ids[data["serial_number"]] = device.id

    await db.commit()
    print(f"✅ Created {len(devices_data)} devices")
    return {"device_ids": ids}


async def seed_material_templates(db: AsyncSession) -> dict:
    """Create material templates."""
    from modules.inventory.models import MaterialTemplate

    count = await _count(db, "material_templates")
    if count > 0:
        print(f"⏭️  Skipping material templates ({count} already exist)")
        return {}

    templates_data = [
        {
            "template_name": "Standard Rooftop Kit",
            "description": "Standard materials for rooftop LiFi installation",
            "materials": [
                {"name": "Mounting Bracket", "quantity": 2, "unit": "pcs"},
                {"name": "Ethernet Cable Cat6 10m", "quantity": 1, "unit": "pcs"},
                {"name": "Weatherproof Sealant", "quantity": 1, "unit": "tube"},
                {"name": "Cable Ties", "quantity": 20, "unit": "pcs"},
            ],
        },
        {
            "template_name": "Indoor Minimal Kit",
            "description": "Minimal materials for indoor LiFi installation",
            "materials": [
                {"name": "Wall Mount Plate", "quantity": 1, "unit": "pcs"},
                {"name": "Power Adapter", "quantity": 1, "unit": "pcs"},
                {"name": "Short Patch Cable", "quantity": 1, "unit": "pcs"},
            ],
        },
    ]

    for data in templates_data:
        template = MaterialTemplate(**data)
        db.add(template)

    await db.commit()
    print(f"✅ Created {len(templates_data)} material templates")
    return {}


async def seed_couples(db: AsyncSession, device_ids: dict) -> dict:
    """Create 4 demo couples with locations and fitting materials."""
    from modules.couples.models import Couple
    from modules.locations.models import Location
    from modules.inventory.models import FittingMaterial

    count = await _count(db, "couples")
    if count > 0:
        print(f"⏭️  Skipping couples ({count} already exist)")
        return {}

    # If we don't have device IDs from this run, query them
    if not device_ids:
        from modules.devices.models import Device

        result = await db.execute(select(Device).where(Device.deleted_at.is_(None)))
        devices = result.scalars().all()
        device_ids = {d.serial_number: d.id for d in devices}

    # Create locations first
    location_configs = [
        {"latitude": 48.8566, "longitude": 2.3522, "address_note": "Paris - Site A1"},
        {"latitude": 48.8606, "longitude": 2.3376, "address_note": "Paris - Site A2"},
        {"latitude": 48.8530, "longitude": 2.3499, "address_note": "Paris - Site B1"},
        {"latitude": 48.8490, "longitude": 2.3410, "address_note": "Paris - Site B2"},
    ]

    location_ids = []
    for loc_data in location_configs:
        loc = Location(**loc_data)
        db.add(loc)
        await db.flush()
        location_ids.append(loc.id)

    couples_data = [
        {
            "name": "Couple A1",
            "has_rf": False,
            "status": "WORKING",
            "location_id": location_ids[0],
            "configuration": {"mode": "standard", "power": "auto", "channel": 1},
            "notes": "Primary installation - Block A",
        },
        {
            "name": "Couple A2",
            "has_rf": True,
            "status": "WORKING",
            "location_id": location_ids[1],
            "configuration": {"mode": "high_performance", "power": "max", "channel": 3},
            "notes": "Secondary installation - Block A",
        },
        {
            "name": "Couple B1",
            "has_rf": False,
            "status": "NOT_WORKING",
            "location_id": location_ids[2],
            "configuration": {"mode": "standard", "power": "auto", "channel": 2},
            "notes": "Primary installation - Block B",
        },
        {
            "name": "Couple B2",
            "has_rf": True,
            "status": "FAULTY",
            "location_id": location_ids[3],
            "configuration": {"mode": "standard", "power": "low", "channel": 4},
            "notes": "Secondary installation - Block B, fault detected",
        },
    ]

    couple_ids = {}
    for data in couples_data:
        couple = Couple(**data)
        db.add(couple)
        await db.flush()
        couple_ids[data["name"]] = couple.id

    # Assign devices to couples
    device_assignments = {
        "IU-001": "Couple A1", "OU-001": "Couple A1", "HC-001": "Couple A1",
        "IU-002": "Couple A2", "OU-002": "Couple A2", "HC-002": "Couple A2", "RF-001": "Couple A2",
        "IU-003": "Couple B1", "OU-003": "Couple B1", "HC-003": "Couple B1",
        "RF-002": "Couple B2",
    }

    from modules.devices.models import Device

    for serial, couple_name in device_assignments.items():
        if serial in device_ids:
            result = await db.execute(
                select(Device).where(Device.id == device_ids[serial])
            )
            device = result.scalar_one_or_none()
            if device:
                device.couple_id = couple_ids[couple_name]

    # Create fitting materials for couples
    materials_for_couples = {
        "Couple A1": [
            {"name": "Mounting Bracket", "quantity": 2, "unit": "pcs"},
            {"name": "Ethernet Cable Cat6 10m", "quantity": 1, "unit": "pcs"},
            {"name": "Weatherproof Sealant", "quantity": 1, "unit": "tube"},
            {"name": "Cable Ties", "quantity": 20, "unit": "pcs"},
        ],
        "Couple A2": [
            {"name": "Mounting Bracket", "quantity": 2, "unit": "pcs"},
            {"name": "Ethernet Cable Cat6 10m", "quantity": 1, "unit": "pcs"},
            {"name": "Weatherproof Sealant", "quantity": 1, "unit": "tube"},
            {"name": "Cable Ties", "quantity": 20, "unit": "pcs"},
        ],
        "Couple B1": [
            {"name": "Wall Mount Plate", "quantity": 1, "unit": "pcs"},
            {"name": "Power Adapter", "quantity": 1, "unit": "pcs"},
            {"name": "Short Patch Cable", "quantity": 1, "unit": "pcs"},
        ],
        "Couple B2": [
            {"name": "Mounting Bracket", "quantity": 2, "unit": "pcs"},
            {"name": "Ethernet Cable Cat6 10m", "quantity": 1, "unit": "pcs"},
            {"name": "Weatherproof Sealant", "quantity": 1, "unit": "tube"},
            {"name": "Cable Ties", "quantity": 20, "unit": "pcs"},
        ],
    }

    for couple_name, materials in materials_for_couples.items():
        for mat in materials:
            fm = FittingMaterial(
                couple_id=couple_ids[couple_name],
                name=mat["name"],
                quantity=mat["quantity"],
                unit=mat.get("unit"),
            )
            db.add(fm)

    await db.commit()
    print(f"✅ Created {len(couples_data)} couples with locations and materials")
    return {"couple_ids": couple_ids}


async def seed_pairs(db: AsyncSession, couple_ids: dict) -> dict:
    """Create 2 pairs."""
    from modules.pairs.models import Pair

    count = await _count(db, "pairs")
    if count > 0:
        print(f"⏭️  Skipping pairs ({count} already exist)")
        return {}

    # If we don't have couple IDs from this run, query them
    if not couple_ids:
        from modules.couples.models import Couple

        result = await db.execute(select(Couple).where(Couple.deleted_at.is_(None)))
        couples = result.scalars().all()
        couple_ids = {c.name: c.id for c in couples}

    pairs_data = [
        {"name": "Pair 01", "status": "WORKING", "notes": "Block A pair - both couples working"},
        {"name": "Pair 02", "status": "FAULTY", "notes": "Block B pair - B2 has fault"},
    ]

    pair_ids = {}
    for data in pairs_data:
        pair = Pair(**data)
        db.add(pair)
        await db.flush()
        pair_ids[data["name"]] = pair.id

    # Assign couples to pairs
    pair_couple_map = {
        "Pair 01": ["Couple A1", "Couple A2"],
        "Pair 02": ["Couple B1", "Couple B2"],
    }

    from modules.couples.models import Couple

    for pair_name, couple_names in pair_couple_map.items():
        for cn in couple_names:
            if cn in couple_ids:
                result = await db.execute(
                    select(Couple).where(Couple.id == couple_ids[cn])
                )
                couple = result.scalar_one_or_none()
                if couple:
                    couple.pair_id = pair_ids[pair_name]

    await db.commit()
    print(f"✅ Created {len(pairs_data)} pairs")
    return {"pair_ids": pair_ids}


async def seed_error_logs(
    db: AsyncSession, device_ids: dict, couple_ids: dict, pair_ids: dict
) -> dict:
    """Create 5 error logs with troubleshoot steps."""
    from modules.troubleshooting.models import ErrorLog, TroubleshootEntry

    count = await _count(db, "error_logs")
    if count > 0:
        print(f"⏭️  Skipping error logs ({count} already exist)")
        return {}

    # If missing IDs, query them
    if not device_ids:
        from modules.devices.models import Device

        result = await db.execute(select(Device).where(Device.deleted_at.is_(None)))
        devices = result.scalars().all()
        device_ids = {d.serial_number: d.id for d in devices}

    if not couple_ids:
        from modules.couples.models import Couple

        result = await db.execute(select(Couple).where(Couple.deleted_at.is_(None)))
        couples = result.scalars().all()
        couple_ids = {c.name: c.id for c in couples}

    if not pair_ids:
        from modules.pairs.models import Pair

        result = await db.execute(select(Pair).where(Pair.deleted_at.is_(None)))
        pairs = result.scalars().all()
        pair_ids = {p.name: p.id for p in pairs}

    now = datetime.now(timezone.utc)

    errors_data = [
        {
            "device_id": device_ids.get("IU-001"),
            "error_type": "Connection Loss",
            "severity": "HIGH",
            "description": "Indoor unit IU-001 lost connection intermittently over 24h period",
            "resolved": True,
            "resolved_at": now - timedelta(days=2),
            "reported_at": now - timedelta(days=5),
            "steps": [
                {"step_number": 1, "step_description": "Check physical connections", "action_taken": "Inspected cables, found loose connector", "resolution": "Reseated connector"},
                {"step_number": 2, "step_description": "Verify signal strength", "action_taken": "Ran diagnostics, signal restored to normal", "resolution": "Confirmed fix - stable signal"},
            ],
        },
        {
            "couple_id": couple_ids.get("Couple A2"),
            "error_type": "Signal Degradation",
            "severity": "MEDIUM",
            "description": "Signal quality degraded on Couple A2, suspected interference",
            "resolved": True,
            "resolved_at": now - timedelta(days=1),
            "reported_at": now - timedelta(days=3),
            "steps": [
                {"step_number": 1, "step_description": "Scan for interference sources", "action_taken": "Identified nearby equipment causing noise", "resolution": "Adjusted channel to avoid interference"},
            ],
        },
        {
            "device_id": device_ids.get("OU-003"),
            "error_type": "Hardware Fault",
            "severity": "CRITICAL",
            "description": "Outdoor unit OU-003 reporting hardware error codes, smoke detected",
            "resolved": False,
            "reported_at": now - timedelta(hours=12),
            "steps": [],
        },
        {
            "couple_id": couple_ids.get("Couple B1"),
            "error_type": "Configuration Mismatch",
            "severity": "LOW",
            "description": "Configuration parameters on Couple B1 don't match expected template",
            "resolved": True,
            "resolved_at": now - timedelta(days=1),
            "reported_at": now - timedelta(days=4),
            "steps": [
                {"step_number": 1, "step_description": "Export current config", "action_taken": "Exported config snapshot", "resolution": None},
                {"step_number": 2, "step_description": "Compare with template", "action_taken": "Found 3 parameter deviations", "resolution": None},
                {"step_number": 3, "step_description": "Apply correct config", "action_taken": "Pushed correct template values", "resolution": "Config aligned with template"},
            ],
        },
        {
            "pair_id": pair_ids.get("Pair 02"),
            "error_type": "RF Interference",
            "severity": "MEDIUM",
            "description": "RF interference detected on Pair 02, affecting B2 couple's RF listener",
            "resolved": False,
            "reported_at": now - timedelta(hours=6),
            "steps": [
                {"step_number": 1, "step_description": "Run spectrum analysis", "action_taken": "Analysis in progress", "resolution": None},
            ],
        },
    ]

    for data in errors_data:
        steps = data.pop("steps", [])
        error = ErrorLog(**data)
        db.add(error)
        await db.flush()

        for step_data in steps:
            step = TroubleshootEntry(error_id=error.id, **step_data)
            db.add(step)

    await db.commit()
    print(f"✅ Created {len(errors_data)} error logs with troubleshoot steps")
    return {}


async def seed_location_history(db: AsyncSession, couple_ids: dict) -> dict:
    """Create 3 location history entries."""
    from modules.locations.models import LocationHistory

    count = await _count(db, "location_history")
    if count > 0:
        print(f"⏭️  Skipping location history ({count} already exist)")
        return {}

    if not couple_ids:
        from modules.couples.models import Couple

        result = await db.execute(select(Couple).where(Couple.deleted_at.is_(None)))
        couples = result.scalars().all()
        couple_ids = {c.name: c.id for c in couples}

    now = datetime.now(timezone.utc)

    history_data = [
        {
            "couple_id": couple_ids.get("Couple A1"),
            "old_latitude": 48.8550,
            "old_longitude": 2.3500,
            "new_latitude": 48.8566,
            "new_longitude": 2.3522,
            "moved_at": now - timedelta(days=7),
            "had_rf": False,
            "distance_meters": 200.0,
            "fitting_materials_snapshot": [
                {"name": "Mounting Bracket", "quantity": 2},
                {"name": "Ethernet Cable Cat6 10m", "quantity": 1},
            ],
            "configuration_snapshot": {"mode": "standard", "power": "auto", "channel": 1},
            "notes": "Relocated from initial position to permanent site",
        },
        {
            "couple_id": couple_ids.get("Couple B1"),
            "old_latitude": 48.8510,
            "old_longitude": 2.3470,
            "new_latitude": 48.8530,
            "new_longitude": 2.3499,
            "moved_at": now - timedelta(days=5),
            "had_rf": False,
            "distance_meters": 350.0,
            "notes": "Moved to better coverage area",
        },
        {
            "couple_id": couple_ids.get("Couple A2"),
            "old_latitude": 48.8620,
            "old_longitude": 2.3400,
            "new_latitude": 48.8606,
            "new_longitude": 2.3376,
            "moved_at": now - timedelta(days=3),
            "had_rf": True,
            "distance_meters": 250.0,
            "fitting_materials_snapshot": [
                {"name": "Mounting Bracket", "quantity": 2},
                {"name": "Weatherproof Sealant", "quantity": 1},
            ],
            "configuration_snapshot": {"mode": "high_performance", "power": "max", "channel": 3},
            "notes": "Adjusted position for optimal RF alignment",
        },
    ]

    for data in history_data:
        if data["couple_id"] is not None:
            entry = LocationHistory(**data)
            db.add(entry)

    await db.commit()
    print(f"✅ Created {len(history_data)} location history entries")
    return {}


async def seed_settings(db: AsyncSession) -> dict:
    """Create default system settings."""
    from modules.settings.models import SystemSetting

    count = await _count(db, "system_settings")
    if count > 0:
        print(f"⏭️  Skipping settings ({count} already exist)")
        return {}

    from modules.settings.service import DEFAULT_SETTINGS

    for key, (value, description) in DEFAULT_SETTINGS.items():
        setting = SystemSetting(key=key, value=value, description=description)
        db.add(setting)

    await db.commit()
    print(f"✅ Created {len(DEFAULT_SETTINGS)} default settings")
    return {}


# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────


async def main():
    print()
    print("NavDashboard Seed Script")
    print("========================")
    print()

    async with async_session_factory() as db:
        try:
            # 1. Users
            await seed_users(db)
        except Exception as e:
            logger.error(f"Error seeding users: {e}")
            await db.rollback()

        try:
            # 2. Personnel
            await seed_personnel(db)
        except Exception as e:
            logger.error(f"Error seeding personnel: {e}")
            await db.rollback()

        try:
            # 3. Devices
            devices_result = await seed_devices(db)
            device_ids = devices_result.get("device_ids", {})
        except Exception as e:
            logger.error(f"Error seeding devices: {e}")
            device_ids = {}
            await db.rollback()

        try:
            # 4. Material Templates
            await seed_material_templates(db)
        except Exception as e:
            logger.error(f"Error seeding material templates: {e}")
            await db.rollback()

        try:
            # 5. Couples
            couples_result = await seed_couples(db, device_ids)
            couple_ids = couples_result.get("couple_ids", {})
        except Exception as e:
            logger.error(f"Error seeding couples: {e}")
            couple_ids = {}
            await db.rollback()

        try:
            # 6. Pairs
            pairs_result = await seed_pairs(db, couple_ids)
            pair_ids = pairs_result.get("pair_ids", {})
        except Exception as e:
            logger.error(f"Error seeding pairs: {e}")
            pair_ids = {}
            await db.rollback()

        try:
            # 7. Error Logs
            await seed_error_logs(db, device_ids, couple_ids, pair_ids)
        except Exception as e:
            logger.error(f"Error seeding error logs: {e}")
            await db.rollback()

        try:
            # 8. Location History
            await seed_location_history(db, couple_ids)
        except Exception as e:
            logger.error(f"Error seeding location history: {e}")
            await db.rollback()

        try:
            # 9. Default Settings
            await seed_settings(db)
        except Exception as e:
            logger.error(f"Error seeding settings: {e}")
            await db.rollback()

    print()
    print("Seed complete!")
    print()


if __name__ == "__main__":
    asyncio.run(main())
