from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from core.exceptions import NotFoundException
from modules.comparison.schemas import ComparisonField, ComparisonResult
from modules.comparison.repository import get_couple_full, get_pair_full, get_device_full


def _compare_field(field_name: str, label: str, value_a, value_b) -> ComparisonField:
    return ComparisonField(
        field_name=field_name,
        label=label,
        value_a=value_a,
        value_b=value_b,
        match=value_a == value_b,
    )


def _compare_nested_list(
    list_a: list[dict],
    list_b: list[dict],
    key_field: str,
    compare_fields: list[tuple[str, str]],
) -> list[ComparisonField]:
    fields: list[ComparisonField] = []
    a_map = {item.get(key_field, f"item_{i}"): item for i, item in enumerate(list_a)}
    b_map = {item.get(key_field, f"item_{i}"): item for i, item in enumerate(list_b)}
    all_keys = list(dict.fromkeys(list(a_map.keys()) + list(b_map.keys())))

    for key in all_keys:
        item_a = a_map.get(key, {})
        item_b = b_map.get(key, {})
        for field_name, label in compare_fields:
            val_a = item_a.get(field_name)
            val_b = item_b.get(field_name)
            fields.append(
                _compare_field(
                    f"{key}.{field_name}",
                    f"{key} — {label}",
                    val_a,
                    val_b,
                )
            )
    return fields


async def compare_couples(db: AsyncSession, id_1: UUID, id_2: UUID) -> ComparisonResult:
    couple_a = await get_couple_full(db, id_1)
    if not couple_a:
        raise NotFoundException(f"Couple {id_1} not found")

    couple_b = await get_couple_full(db, id_2)
    if not couple_b:
        raise NotFoundException(f"Couple {id_2} not found")

    field_defs = [
        ("name", "Name"),
        ("status", "Status"),
        ("has_rf", "Has RF"),
        ("handling_person_name", "Handling Person"),
        ("latitude", "Latitude"),
        ("longitude", "Longitude"),
        ("notes", "Notes"),
        ("configuration", "Configuration"),
        ("custom_fields", "Custom Fields"),
    ]

    fields = [
        _compare_field(fd[0], fd[1], couple_a.get(fd[0]), couple_b.get(fd[0]))
        for fd in field_defs
    ]

    match_count = sum(1 for f in fields if f.match)
    diff_count = sum(1 for f in fields if not f.match)

    nested: dict[str, list[ComparisonField]] = {}

    device_fields = _compare_nested_list(
        couple_a.get("devices", []),
        couple_b.get("devices", []),
        "device_type",
        [("serial_number", "Serial Number"), ("status", "Status")],
    )
    if device_fields:
        nested["devices"] = device_fields
        match_count += sum(1 for f in device_fields if f.match)
        diff_count += sum(1 for f in device_fields if not f.match)

    material_fields = _compare_nested_list(
        couple_a.get("fitting_materials", []),
        couple_b.get("fitting_materials", []),
        "name",
        [("quantity", "Quantity"), ("unit", "Unit")],
    )
    if material_fields:
        nested["materials"] = material_fields
        match_count += sum(1 for f in material_fields if f.match)
        diff_count += sum(1 for f in material_fields if not f.match)

    return ComparisonResult(
        entity_type="couple",
        entity_a_id=id_1,
        entity_a_name=couple_a["name"],
        entity_b_id=id_2,
        entity_b_name=couple_b["name"],
        fields=fields,
        match_count=match_count,
        diff_count=diff_count,
        nested_comparisons=nested if nested else None,
    )


async def compare_pairs(db: AsyncSession, id_1: UUID, id_2: UUID) -> ComparisonResult:
    pair_a = await get_pair_full(db, id_1)
    if not pair_a:
        raise NotFoundException(f"Pair {id_1} not found")

    pair_b = await get_pair_full(db, id_2)
    if not pair_b:
        raise NotFoundException(f"Pair {id_2} not found")

    field_defs = [
        ("name", "Name"),
        ("status", "Status"),
        ("status_override", "Status Override"),
        ("handling_person_name", "Handling Person"),
        ("notes", "Notes"),
        ("custom_fields", "Custom Fields"),
    ]

    fields = [
        _compare_field(fd[0], fd[1], pair_a.get(fd[0]), pair_b.get(fd[0]))
        for fd in field_defs
    ]

    match_count = sum(1 for f in fields if f.match)
    diff_count = sum(1 for f in fields if not f.match)

    nested: dict[str, list[ComparisonField]] = {}

    couple_fields = _compare_nested_list(
        pair_a.get("couples", []),
        pair_b.get("couples", []),
        "name",
        [("status", "Status"), ("has_rf", "Has RF")],
    )
    if couple_fields:
        nested["couples"] = couple_fields
        match_count += sum(1 for f in couple_fields if f.match)
        diff_count += sum(1 for f in couple_fields if not f.match)

    return ComparisonResult(
        entity_type="pair",
        entity_a_id=id_1,
        entity_a_name=pair_a["name"],
        entity_b_id=id_2,
        entity_b_name=pair_b["name"],
        fields=fields,
        match_count=match_count,
        diff_count=diff_count,
        nested_comparisons=nested if nested else None,
    )


async def compare_devices(db: AsyncSession, id_1: UUID, id_2: UUID) -> ComparisonResult:
    device_a = await get_device_full(db, id_1)
    if not device_a:
        raise NotFoundException(f"Device {id_1} not found")

    device_b = await get_device_full(db, id_2)
    if not device_b:
        raise NotFoundException(f"Device {id_2} not found")

    field_defs = [
        ("serial_number", "Serial Number"),
        ("device_type", "Device Type"),
        ("status", "Status"),
        ("couple_name", "Couple Assignment"),
        ("handling_person_name", "Handling Person"),
        ("notes", "Notes"),
        ("custom_fields", "Custom Fields"),
        ("metadata_json", "Metadata"),
    ]

    fields = [
        _compare_field(fd[0], fd[1], device_a.get(fd[0]), device_b.get(fd[0]))
        for fd in field_defs
    ]

    match_count = sum(1 for f in fields if f.match)
    diff_count = sum(1 for f in fields if not f.match)

    return ComparisonResult(
        entity_type="device",
        entity_a_id=id_1,
        entity_a_name=device_a["serial_number"],
        entity_b_id=id_2,
        entity_b_name=device_b["serial_number"],
        fields=fields,
        match_count=match_count,
        diff_count=diff_count,
        nested_comparisons=None,
    )