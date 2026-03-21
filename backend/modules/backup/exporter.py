import csv
import io
import json
import logging
import zipfile
from datetime import datetime
from uuid import UUID

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.models import User
from modules.couples.models import Couple
from modules.devices.models import Device, DeviceStatusHistory
from modules.inventory.models import FittingMaterial, MaterialTemplate
from modules.locations.models import Location, LocationHistory
from modules.pairs.models import Pair
from modules.personnel.models import Person
from modules.status.models import StatusChangeLog
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry

logger = logging.getLogger(__name__)


def _get_export_tables() -> list[dict]:
    return [
        {
            "name": "Devices",
            "key": "devices",
            "model": Device,
            "columns": [
                "id", "serial_number", "device_type", "couple_id", "status",
                "handling_person_id", "notes", "metadata_json", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "Couples",
            "key": "couples",
            "model": Couple,
            "columns": [
                "id", "name", "status", "location_id", "pair_id", "notes",
                "custom_fields", "created_at", "updated_at",
            ],
        },
        {
            "name": "Pairs",
            "key": "pairs",
            "model": Pair,
            "columns": [
                "id", "name", "status", "notes", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "Locations",
            "key": "locations",
            "model": Location,
            "columns": [
                "id", "latitude", "longitude", "address_note",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "LocationHistory",
            "key": "location_history",
            "model": LocationHistory,
            "columns": [
                "id", "couple_id", "old_latitude", "old_longitude",
                "new_latitude", "new_longitude", "moved_at", "handled_by",
                "had_rf", "distance_meters", "fitting_materials_snapshot",
                "configuration_snapshot", "notes", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "Personnel",
            "key": "personnel",
            "model": Person,
            "columns": [
                "id", "full_name", "role", "email", "phone", "notes",
                "custom_fields", "created_at", "updated_at",
            ],
        },
        {
            "name": "FittingMaterials",
            "key": "fitting_materials",
            "model": FittingMaterial,
            "columns": [
                "id", "couple_id", "name", "description", "quantity",
                "unit", "is_template", "custom_fields", "created_at", "updated_at",
            ],
        },
        {
            "name": "MaterialTemplates",
            "key": "material_templates",
            "model": MaterialTemplate,
            "columns": [
                "id", "template_name", "description", "materials",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "ErrorLogs",
            "key": "error_logs",
            "model": ErrorLog,
            "columns": [
                "id", "device_id", "couple_id", "pair_id", "error_type",
                "severity", "description", "reported_by", "reported_at",
                "resolved", "resolved_at", "resolved_by", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "TroubleshootEntries",
            "key": "troubleshoot_entries",
            "model": TroubleshootEntry,
            "columns": [
                "id", "error_id", "step_number", "step_description",
                "action_taken", "resolution", "performed_by", "performed_at",
                "custom_fields", "created_at", "updated_at",
            ],
        },
        {
            "name": "StatusChangeLogs",
            "key": "status_change_logs",
            "model": StatusChangeLog,
            "columns": [
                "id", "entity_type", "entity_id", "old_status", "new_status",
                "changed_by", "reason", "created_at",
            ],
        },
        {
            "name": "Users",
            "key": "users",
            "model": User,
            "columns": [
                "id", "email", "username", "full_name", "role", "is_active",
                "created_at", "updated_at",
            ],
        },
    ]


def _serialize_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return json.dumps(value, default=str)
    if isinstance(value, bool):
        return str(value)
    return str(value)


def _model_to_row(instance, columns: list[str]) -> list[str]:
    row = []
    for col in columns:
        val = getattr(instance, col, None)
        row.append(_serialize_value(val))
    return row


async def _query_table(db: AsyncSession, model, has_deleted_at: bool = True) -> list:
    stmt = select(model)
    if has_deleted_at:
        try:
            stmt = stmt.where(model.deleted_at.is_(None))
        except AttributeError:
            pass
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def export_xlsx(db: AsyncSession, tables: list[str] | None = None) -> bytes:
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="151515", end_color="151515", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")

    export_tables = _get_export_tables()

    for table_info in export_tables:
        if tables and table_info["key"] not in tables:
            continue

        try:
            rows_data = await _query_table(db, table_info["model"])
        except Exception as e:
            logger.warning(f"Failed to query {table_info['name']}: {e}")
            continue

        ws = wb.create_sheet(title=table_info["name"])
        columns = table_info["columns"]

        for col_idx, col_name in enumerate(columns, 1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment

        for row_idx, instance in enumerate(rows_data, 2):
            row_values = _model_to_row(instance, columns)
            for col_idx, val in enumerate(row_values, 1):
                ws.cell(row=row_idx, column=col_idx, value=val)

        for col_idx, col_name in enumerate(columns, 1):
            max_length = len(col_name)
            for row_idx in range(2, len(rows_data) + 2):
                cell_val = ws.cell(row=row_idx, column=col_idx).value
                if cell_val:
                    max_length = max(max_length, min(len(str(cell_val)), 50))
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = max_length + 2

    if len(wb.sheetnames) == 0:
        wb.create_sheet(title="Empty")

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


async def export_csv(db: AsyncSession, tables: list[str] | None = None) -> bytes:
    zip_buffer = io.BytesIO()
    export_tables = _get_export_tables()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for table_info in export_tables:
            if tables and table_info["key"] not in tables:
                continue

            try:
                rows_data = await _query_table(db, table_info["model"])
            except Exception as e:
                logger.warning(f"Failed to query {table_info['name']}: {e}")
                continue

            csv_buffer = io.StringIO()
            columns = table_info["columns"]
            writer = csv.writer(csv_buffer)
            writer.writerow(columns)

            for instance in rows_data:
                row_values = _model_to_row(instance, columns)
                writer.writerow(row_values)

            zf.writestr(f"{table_info['key']}.csv", csv_buffer.getvalue())

    zip_buffer.seek(0)
    return zip_buffer.getvalue()