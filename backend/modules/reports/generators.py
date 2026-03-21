import io
import logging
from collections import Counter
from datetime import datetime
from typing import Optional
from uuid import UUID

import xlsxwriter
from sqlalchemy.ext.asyncio import AsyncSession

from modules.reports import repository
from modules.reports.templates_pdf import (
    add_summary_section,
    add_table_to_pdf,
    create_pdf_template,
    finalize_pdf,
)

logger = logging.getLogger(__name__)


def _fmt_uuid(val) -> str:
    return str(val)[:8] if val else "-"


def _fmt_dt(val) -> str:
    if val is None:
        return "-"
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M")
    return str(val)


def _fmt_val(val) -> str:
    if val is None:
        return "-"
    return str(val)


# ═══════════════════════════════════════════
# DEVICE INVENTORY
# ═══════════════════════════════════════════

async def generate_device_inventory_pdf(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    devices = await repository.get_devices_for_report(db, date_from, date_to, entity_ids)

    doc, elements = create_pdf_template("Device Inventory Report", f"Total: {len(devices)} devices")

    type_counts = Counter(d.device_type for d in devices)
    status_counts = Counter(d.status for d in devices)

    add_summary_section(elements, {
        "Total Devices": str(len(devices)),
        **{f"Type {k}": str(v) for k, v in type_counts.items()},
        **{f"Status {k}": str(v) for k, v in status_counts.items()},
    })

    headers = ["Serial Number", "Type", "Status", "Couple ID", "Handler ID", "Notes"]
    rows = []
    for d in devices:
        rows.append([
            _fmt_val(d.serial_number),
            _fmt_val(d.device_type),
            _fmt_val(d.status),
            _fmt_uuid(d.couple_id),
            _fmt_uuid(d.handling_person_id),
            _fmt_val(d.notes)[:50] if d.notes else "-",
        ])

    add_table_to_pdf(elements, headers, rows, "Device List")

    return finalize_pdf(doc, elements)


async def generate_device_inventory_xlsx(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    devices = await repository.get_devices_for_report(db, date_from, date_to, entity_ids)

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer)
    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#151515", "font_color": "#FFFFFF",
        "border": 1,
    })

    summary_ws = workbook.add_worksheet("Summary")
    type_counts = Counter(d.device_type for d in devices)
    status_counts = Counter(d.status for d in devices)

    summary_ws.write(0, 0, "Metric", header_fmt)
    summary_ws.write(0, 1, "Value", header_fmt)
    row_idx = 1
    summary_ws.write(row_idx, 0, "Total Devices")
    summary_ws.write(row_idx, 1, len(devices))
    row_idx += 1
    for k, v in type_counts.items():
        summary_ws.write(row_idx, 0, f"Type {k}")
        summary_ws.write(row_idx, 1, v)
        row_idx += 1
    for k, v in status_counts.items():
        summary_ws.write(row_idx, 0, f"Status {k}")
        summary_ws.write(row_idx, 1, v)
        row_idx += 1

    ws = workbook.add_worksheet("Devices")
    headers = ["Serial Number", "Type", "Status", "Couple ID", "Handler ID", "Notes", "Created At"]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_fmt)

    for row, d in enumerate(devices, 1):
        ws.write(row, 0, _fmt_val(d.serial_number))
        ws.write(row, 1, _fmt_val(d.device_type))
        ws.write(row, 2, _fmt_val(d.status))
        ws.write(row, 3, _fmt_uuid(d.couple_id))
        ws.write(row, 4, _fmt_uuid(d.handling_person_id))
        ws.write(row, 5, _fmt_val(d.notes))
        ws.write(row, 6, _fmt_dt(d.created_at))

    ws.set_column(0, 6, 18)

    workbook.close()
    buffer.seek(0)
    return buffer.getvalue()


# ═══════════════════════════════════════════
# ERROR SUMMARY
# ═══════════════════════════════════════════

async def generate_error_summary_pdf(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    errors = await repository.get_errors_for_report(db, date_from, date_to, entity_ids)

    doc, elements = create_pdf_template("Error Summary Report", f"Total: {len(errors)} errors")

    severity_counts = Counter(e.severity for e in errors)
    resolved_count = sum(1 for e in errors if e.resolved)
    resolution_rate = f"{(resolved_count / len(errors) * 100):.1f}%" if errors else "N/A"

    add_summary_section(elements, {
        "Total Errors": str(len(errors)),
        "Resolved": str(resolved_count),
        "Resolution Rate": resolution_rate,
        **{f"Severity {k}": str(v) for k, v in severity_counts.items()},
    })

    headers = ["Date", "Error Type", "Severity", "Status", "Description"]
    rows = []
    for e in errors:
        rows.append([
            _fmt_dt(e.reported_at),
            _fmt_val(e.error_type),
            _fmt_val(e.severity),
            "Resolved" if e.resolved else "Open",
            _fmt_val(e.description)[:60] if e.description else "-",
        ])

    add_table_to_pdf(elements, headers, rows, "Error List")

    return finalize_pdf(doc, elements)


async def generate_error_summary_xlsx(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    errors = await repository.get_errors_for_report(db, date_from, date_to, entity_ids)

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer)
    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#151515", "font_color": "#FFFFFF",
        "border": 1,
    })

    severity_counts = Counter(e.severity for e in errors)
    resolved_count = sum(1 for e in errors if e.resolved)

    summary_ws = workbook.add_worksheet("Summary")
    summary_ws.write(0, 0, "Metric", header_fmt)
    summary_ws.write(0, 1, "Value", header_fmt)
    row_idx = 1
    summary_ws.write(row_idx, 0, "Total Errors")
    summary_ws.write(row_idx, 1, len(errors))
    row_idx += 1
    summary_ws.write(row_idx, 0, "Resolved")
    summary_ws.write(row_idx, 1, resolved_count)
    row_idx += 1
    for k, v in severity_counts.items():
        summary_ws.write(row_idx, 0, f"Severity {k}")
        summary_ws.write(row_idx, 1, v)
        row_idx += 1

    ws = workbook.add_worksheet("Errors")
    headers = ["Date", "Error Type", "Severity", "Status", "Description", "Device ID", "Couple ID"]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_fmt)

    for row, e in enumerate(errors, 1):
        ws.write(row, 0, _fmt_dt(e.reported_at))
        ws.write(row, 1, _fmt_val(e.error_type))
        ws.write(row, 2, _fmt_val(e.severity))
        ws.write(row, 3, "Resolved" if e.resolved else "Open")
        ws.write(row, 4, _fmt_val(e.description))
        ws.write(row, 5, _fmt_uuid(e.device_id))
        ws.write(row, 6, _fmt_uuid(e.couple_id))

    ws.set_column(0, 6, 18)

    workbook.close()
    buffer.seek(0)
    return buffer.getvalue()


# ═══════════════════════════════════════════
# LOCATION HISTORY
# ═══════════════════════════════════════════

async def generate_location_history_pdf(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    history = await repository.get_location_history_for_report(db, date_from, date_to, entity_ids)

    doc, elements = create_pdf_template(
        "Location History Report", f"Total: {len(history)} movements"
    )

    total_distance = sum(h.distance_meters or 0 for h in history)
    rf_count = sum(1 for h in history if h.had_rf)

    add_summary_section(elements, {
        "Total Movements": str(len(history)),
        "Total Distance": f"{total_distance:.1f} m",
        "Movements with RF": str(rf_count),
    })

    headers = ["Date", "Couple ID", "From (lat,lng)", "To (lat,lng)", "Distance (m)", "Had RF"]
    rows = []
    for h in history:
        rows.append([
            _fmt_dt(h.moved_at),
            _fmt_uuid(h.couple_id),
            f"{h.old_latitude:.4f}, {h.old_longitude:.4f}",
            f"{h.new_latitude:.4f}, {h.new_longitude:.4f}",
            f"{h.distance_meters:.1f}" if h.distance_meters else "-",
            "Yes" if h.had_rf else "No",
        ])

    add_table_to_pdf(elements, headers, rows, "Movement Log")

    return finalize_pdf(doc, elements)


async def generate_location_history_xlsx(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    history = await repository.get_location_history_for_report(db, date_from, date_to, entity_ids)

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer)
    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#151515", "font_color": "#FFFFFF",
        "border": 1,
    })

    ws = workbook.add_worksheet("LocationHistory")
    headers = [
        "Date", "Couple ID", "Old Lat", "Old Lng",
        "New Lat", "New Lng", "Distance (m)", "Had RF", "Handler", "Notes",
    ]
    for col, h in enumerate(headers):
        ws.write(0, col, h, header_fmt)

    for row, h in enumerate(history, 1):
        ws.write(row, 0, _fmt_dt(h.moved_at))
        ws.write(row, 1, _fmt_uuid(h.couple_id))
        ws.write(row, 2, h.old_latitude)
        ws.write(row, 3, h.old_longitude)
        ws.write(row, 4, h.new_latitude)
        ws.write(row, 5, h.new_longitude)
        ws.write(row, 6, h.distance_meters or 0)
        ws.write(row, 7, "Yes" if h.had_rf else "No")
        ws.write(row, 8, _fmt_uuid(h.handled_by))
        ws.write(row, 9, _fmt_val(h.notes))

    ws.set_column(0, 9, 16)

    workbook.close()
    buffer.seek(0)
    return buffer.getvalue()


# ═══════════════════════════════════════════
# PAIR STATUS
# ═══════════════════════════════════════════

async def generate_pair_status_pdf(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    pairs = await repository.get_pairs_for_report(db, entity_ids)
    couples = await repository.get_couples_for_report(db)

    doc, elements = create_pdf_template("Pair Status Report", f"Total: {len(pairs)} pairs")

    status_counts = Counter(p.status for p in pairs)

    add_summary_section(elements, {
        "Total Pairs": str(len(pairs)),
        "Total Couples": str(len(couples)),
        **{f"Status {k}": str(v) for k, v in status_counts.items()},
    })

    headers = ["Pair Name", "Status", "Notes", "Created"]
    rows = []
    for p in pairs:
        rows.append([
            _fmt_val(p.name),
            _fmt_val(p.status),
            _fmt_val(p.notes)[:50] if p.notes else "-",
            _fmt_dt(p.created_at),
        ])

    add_table_to_pdf(elements, headers, rows, "Pairs")

    couple_headers = ["Couple Name", "Status", "Pair ID", "Location ID"]
    couple_rows = []
    for c in couples:
        couple_rows.append([
            _fmt_val(c.name),
            _fmt_val(c.status),
            _fmt_uuid(c.pair_id),
            _fmt_uuid(c.location_id),
        ])

    add_table_to_pdf(elements, couple_headers, couple_rows, "Couples")

    return finalize_pdf(doc, elements)


async def generate_pair_status_xlsx(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    pairs = await repository.get_pairs_for_report(db, entity_ids)
    couples = await repository.get_couples_for_report(db)

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer)
    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#151515", "font_color": "#FFFFFF",
        "border": 1,
    })

    ws_pairs = workbook.add_worksheet("Pairs")
    pair_headers = ["Name", "Status", "Notes", "Created"]
    for col, h in enumerate(pair_headers):
        ws_pairs.write(0, col, h, header_fmt)
    for row, p in enumerate(pairs, 1):
        ws_pairs.write(row, 0, _fmt_val(p.name))
        ws_pairs.write(row, 1, _fmt_val(p.status))
        ws_pairs.write(row, 2, _fmt_val(p.notes))
        ws_pairs.write(row, 3, _fmt_dt(p.created_at))
    ws_pairs.set_column(0, 3, 18)

    ws_couples = workbook.add_worksheet("Couples")
    couple_headers = ["Name", "Status", "Pair ID", "Location ID"]
    for col, h in enumerate(couple_headers):
        ws_couples.write(0, col, h, header_fmt)
    for row, c in enumerate(couples, 1):
        ws_couples.write(row, 0, _fmt_val(c.name))
        ws_couples.write(row, 1, _fmt_val(c.status))
        ws_couples.write(row, 2, _fmt_uuid(c.pair_id))
        ws_couples.write(row, 3, _fmt_uuid(c.location_id))
    ws_couples.set_column(0, 3, 18)

    workbook.close()
    buffer.seek(0)
    return buffer.getvalue()


# ═══════════════════════════════════════════
# FULL SYSTEM
# ═══════════════════════════════════════════

async def generate_full_system_pdf(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    devices = await repository.get_devices_for_report(db, date_from, date_to)
    errors = await repository.get_errors_for_report(db, date_from, date_to)
    history = await repository.get_location_history_for_report(db, date_from, date_to)
    pairs = await repository.get_pairs_for_report(db)
    couples = await repository.get_couples_for_report(db)

    doc, elements = create_pdf_template(
        "Full System Report",
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
    )

    resolved_count = sum(1 for e in errors if e.resolved)
    add_summary_section(elements, {
        "Total Devices": str(len(devices)),
        "Total Pairs": str(len(pairs)),
        "Total Couples": str(len(couples)),
        "Total Errors": str(len(errors)),
        "Resolved Errors": str(resolved_count),
        "Location Movements": str(len(history)),
    })

    dev_headers = ["Serial Number", "Type", "Status"]
    dev_rows = [[_fmt_val(d.serial_number), _fmt_val(d.device_type), _fmt_val(d.status)] for d in devices[:100]]
    add_table_to_pdf(elements, dev_headers, dev_rows, "Devices (top 100)")

    err_headers = ["Date", "Type", "Severity", "Status"]
    err_rows = [
        [_fmt_dt(e.reported_at), _fmt_val(e.error_type), _fmt_val(e.severity), "Resolved" if e.resolved else "Open"]
        for e in errors[:100]
    ]
    add_table_to_pdf(elements, err_headers, err_rows, "Recent Errors (top 100)")

    pair_headers = ["Name", "Status"]
    pair_rows = [[_fmt_val(p.name), _fmt_val(p.status)] for p in pairs]
    add_table_to_pdf(elements, pair_headers, pair_rows, "Pairs")

    return finalize_pdf(doc, elements)


async def generate_full_system_xlsx(
    db: AsyncSession,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    entity_ids: Optional[list[UUID]] = None,
) -> bytes:
    devices = await repository.get_devices_for_report(db, date_from, date_to)
    errors = await repository.get_errors_for_report(db, date_from, date_to)
    history = await repository.get_location_history_for_report(db, date_from, date_to)
    pairs = await repository.get_pairs_for_report(db)
    couples = await repository.get_couples_for_report(db)

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer)
    header_fmt = workbook.add_format({
        "bold": True, "bg_color": "#151515", "font_color": "#FFFFFF",
        "border": 1,
    })

    # Summary sheet
    summary_ws = workbook.add_worksheet("Summary")
    summary_ws.write(0, 0, "Metric", header_fmt)
    summary_ws.write(0, 1, "Value", header_fmt)
    resolved_count = sum(1 for e in errors if e.resolved)
    summary_data = [
        ("Total Devices", len(devices)),
        ("Total Pairs", len(pairs)),
        ("Total Couples", len(couples)),
        ("Total Errors", len(errors)),
        ("Resolved Errors", resolved_count),
        ("Location Movements", len(history)),
    ]
    for row_idx, (metric, value) in enumerate(summary_data, 1):
        summary_ws.write(row_idx, 0, metric)
        summary_ws.write(row_idx, 1, value)
    summary_ws.set_column(0, 1, 22)

    # Devices sheet
    ws_dev = workbook.add_worksheet("Devices")
    dh = ["Serial Number", "Type", "Status", "Couple ID", "Handler", "Notes", "Created"]
    for col, h in enumerate(dh):
        ws_dev.write(0, col, h, header_fmt)
    for row, d in enumerate(devices, 1):
        ws_dev.write(row, 0, _fmt_val(d.serial_number))
        ws_dev.write(row, 1, _fmt_val(d.device_type))
        ws_dev.write(row, 2, _fmt_val(d.status))
        ws_dev.write(row, 3, _fmt_uuid(d.couple_id))
        ws_dev.write(row, 4, _fmt_uuid(d.handling_person_id))
        ws_dev.write(row, 5, _fmt_val(d.notes))
        ws_dev.write(row, 6, _fmt_dt(d.created_at))
    ws_dev.set_column(0, 6, 18)

    # Errors sheet
    ws_err = workbook.add_worksheet("Errors")
    eh = ["Date", "Error Type", "Severity", "Status", "Description", "Device ID"]
    for col, h in enumerate(eh):
        ws_err.write(0, col, h, header_fmt)
    for row, e in enumerate(errors, 1):
        ws_err.write(row, 0, _fmt_dt(e.reported_at))
        ws_err.write(row, 1, _fmt_val(e.error_type))
        ws_err.write(row, 2, _fmt_val(e.severity))
        ws_err.write(row, 3, "Resolved" if e.resolved else "Open")
        ws_err.write(row, 4, _fmt_val(e.description))
        ws_err.write(row, 5, _fmt_uuid(e.device_id))
    ws_err.set_column(0, 5, 18)

    # Pairs sheet
    ws_pairs = workbook.add_worksheet("Pairs")
    ph = ["Name", "Status", "Notes", "Created"]
    for col, h in enumerate(ph):
        ws_pairs.write(0, col, h, header_fmt)
    for row, p in enumerate(pairs, 1):
        ws_pairs.write(row, 0, _fmt_val(p.name))
        ws_pairs.write(row, 1, _fmt_val(p.status))
        ws_pairs.write(row, 2, _fmt_val(p.notes))
        ws_pairs.write(row, 3, _fmt_dt(p.created_at))
    ws_pairs.set_column(0, 3, 18)

    # Couples sheet
    ws_couples = workbook.add_worksheet("Couples")
    ch = ["Name", "Status", "Pair ID", "Location ID"]
    for col, h in enumerate(ch):
        ws_couples.write(0, col, h, header_fmt)
    for row, c in enumerate(couples, 1):
        ws_couples.write(row, 0, _fmt_val(c.name))
        ws_couples.write(row, 1, _fmt_val(c.status))
        ws_couples.write(row, 2, _fmt_uuid(c.pair_id))
        ws_couples.write(row, 3, _fmt_uuid(c.location_id))
    ws_couples.set_column(0, 3, 18)

    # Location History sheet
    ws_loc = workbook.add_worksheet("LocationHistory")
    lh = ["Date", "Couple ID", "Old Lat", "Old Lng", "New Lat", "New Lng", "Distance", "Had RF"]
    for col, h in enumerate(lh):
        ws_loc.write(0, col, h, header_fmt)
    for row, h in enumerate(history, 1):
        ws_loc.write(row, 0, _fmt_dt(h.moved_at))
        ws_loc.write(row, 1, _fmt_uuid(h.couple_id))
        ws_loc.write(row, 2, h.old_latitude)
        ws_loc.write(row, 3, h.old_longitude)
        ws_loc.write(row, 4, h.new_latitude)
        ws_loc.write(row, 5, h.new_longitude)
        ws_loc.write(row, 6, h.distance_meters or 0)
        ws_loc.write(row, 7, "Yes" if h.had_rf else "No")
    ws_loc.set_column(0, 7, 16)

    workbook.close()
    buffer.seek(0)
    return buffer.getvalue()