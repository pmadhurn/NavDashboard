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

from modules.auth.models import (
    Role,
    RolePermission,
    User,
    UserPermissionOverride,
    UserRole,
)
from modules.couples.models import Couple
from modules.devices.models import Device, DeviceModel, DeviceStatusHistory
from modules.inventory.models import FittingMaterial, MaterialTemplate
from modules.locations.models import Location, LocationHistory
from modules.pairs.models import Pair
from modules.personnel.models import Person
from modules.status.models import StatusChangeLog
from modules.troubleshooting.models import ErrorLog, TroubleshootEntry
from modules.projects.models import (
    Project,
    ProjectDeployment,
    ProjectMember,
    ProjectPhase,
    ProjectTimelineEntry,
)
from modules.finance.models import (
    Expense,
    ExpenseBatch,
    ExpenseClaim,
    ExpenseMember,
    FundAllocation,
)
from modules.assets.movement_models import (
    AssetBundle,
    AssetBundleItem,
    AssetHandover,
    AssetHandoverItem,
    AssetRepair,
)
from modules.assets.custody_models import (
    AssetMovement,
    Customer,
    StockLocation,
    Vendor,
)
from modules.assets.models import Asset, AssetCategory, AssetHistory, AssetReport
from modules.assets.request_models import ItemRequest
from modules.documents.models import Document
from modules.downloads.models import (
    DownloadCategory,
    DownloadItem,
    DownloadItemAccess,
    DownloadVersion,
)
from modules.projects.models import EquipmentMovement, EquipmentMovementItem
from modules.personnel.models import AssignmentHistory
from modules.devices.models import DeviceStatusHistory as DSH
from modules.auth.models import UserScope
from modules.attendance.models import AttendanceDay, CompOffLedger
from modules.updates.models import DailyUpdate, UpdateComment

logger = logging.getLogger(__name__)


def _get_export_tables() -> list[dict]:
    return [
        {
            "name": "DeviceModels",
            "key": "device_models",
            "model": DeviceModel,
            "columns": ["id", "name", "device_type", "notes",
                        "created_at", "updated_at"],
        },
        {
            "name": "Devices",
            "key": "devices",
            "model": Device,
            "columns": [
                "id", "serial_number", "device_type", "couple_id", "status",
                "handling_person_id", "device_model_id", "notes",
                "metadata_json", "custom_fields",
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
                "user_id", "team_lead_id",
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
        {
            # Access is three tables now. Without them a restore leaves every
            # user with a login and no permissions — which looks plausible, so
            # nobody notices until someone cannot do their job.
            "name": "Roles",
            "key": "roles",
            "model": Role,
            "columns": ["id", "name", "description", "is_system", "created_at", "updated_at"],
        },
        {
            "name": "RolePermissions",
            "key": "role_permissions",
            "model": RolePermission,
            "columns": ["id", "role_id", "permission_key", "created_at"],
        },
        {
            "name": "UserRoles",
            "key": "user_roles",
            "model": UserRole,
            "columns": ["id", "user_id", "role_id", "created_at"],
        },
        {
            "name": "UserPermissionOverrides",
            "key": "user_permission_overrides",
            "model": UserPermissionOverride,
            "columns": ["id", "user_id", "permission_key", "effect", "created_at"],
        },
        # --- Inventory custody (Phase 1) ------------------------------------
        {
            "name": "StockLocations",
            "key": "stock_locations",
            "model": StockLocation,
            "columns": ["id", "name", "kind", "address", "notes", "sort_order",
                        "is_default", "created_at", "updated_at"],
        },
        {
            "name": "Customers",
            "key": "customers",
            "model": Customer,
            "columns": ["id", "name", "contact_name", "contact_phone",
                        "contact_email", "notes", "created_at", "updated_at"],
        },
        {
            "name": "Vendors",
            "key": "vendors",
            "model": Vendor,
            "columns": ["id", "name", "contact_name", "contact_phone",
                        "contact_email", "notes", "created_at", "updated_at"],
        },
        {
            # The ledger is the record; the columns on assets are a cache of it.
            # A restore without this would keep every item's position and lose
            # every explanation of how it got there.
            "name": "AssetMovements",
            "key": "asset_movements",
            "model": AssetMovement,
            "columns": ["id", "asset_id", "event_type", "from_custody_type",
                        "from_custody_id", "to_custody_type", "to_custody_id",
                        "from_condition", "to_condition", "quantity", "reason",
                        "source_type", "source_id", "performed_by",
                        "occurred_at", "created_at"],
        },
        {
            "name": "AssetHandovers",
            "key": "asset_handovers",
            "model": AssetHandover,
            "columns": ["id", "from_person_id", "to_person_id", "status", "note",
                        "response_note", "initiated_by", "responded_by",
                        "responded_at", "created_at"],
        },
        {
            "name": "AssetHandoverItems",
            "key": "asset_handover_items",
            "model": AssetHandoverItem,
            "columns": ["id", "handover_id", "asset_id", "quantity", "created_at"],
        },
        {
            "name": "AssetBundles",
            "key": "asset_bundles",
            "model": AssetBundle,
            "columns": ["id", "name", "description", "created_at", "updated_at"],
        },
        {
            "name": "AssetBundleItems",
            "key": "asset_bundle_items",
            "model": AssetBundleItem,
            "columns": ["id", "bundle_id", "asset_id", "quantity", "created_at"],
        },
        {
            "name": "AssetRepairs",
            "key": "asset_repairs",
            "model": AssetRepair,
            "columns": ["id", "asset_id", "status", "damage_details", "damaged_at",
                        "damage_location", "responsible_person_id", "project_id",
                        "is_repairable", "vendor_id", "cost", "sent_at",
                        "received_at", "outcome_note", "reported_by", "created_at"],
        },
        # --- The rest (Phase 11): every remaining business table -------------
        # A "full backup" that silently drops the whole Downloads archive, all
        # equipment movement history and every scope grant is not a backup.
        {"name": "DownloadCategories", "key": "download_categories", "model": DownloadCategory,
         "columns": ["id", "name", "description", "sort_order", "created_at", "updated_at"]},
        {"name": "DownloadItems", "key": "download_items", "model": DownloadItem,
         "columns": ["id", "category_id", "title", "description", "created_at", "updated_at"]},
        {"name": "DownloadVersions", "key": "download_versions", "model": DownloadVersion,
         "columns": ["id", "item_id", "version", "file_path", "file_size",
                     "uploaded_by", "created_at"]},
        {"name": "DownloadItemAccess", "key": "download_item_access", "model": DownloadItemAccess,
         "columns": ["id", "item_id", "user_id", "created_at"]},
        {"name": "EquipmentMovements", "key": "equipment_movements", "model": EquipmentMovement,
         "columns": ["id", "project_id", "phase_id", "direction", "handled_by",
                     "received_by_name", "notes", "created_at", "updated_at"]},
        {"name": "EquipmentMovementItems", "key": "equipment_movement_items",
         "model": EquipmentMovementItem,
         "columns": ["id", "movement_id", "asset_id", "quantity", "condition_note",
                     "item_status", "return_outcome", "outcome_note", "resolved_at",
                     "created_at"]},
        {"name": "AssignmentHistory", "key": "assignment_history", "model": AssignmentHistory,
         "columns": ["id", "person_id", "entity_type", "entity_id",
                     "assigned_at", "unassigned_at", "created_at"]},
        {"name": "DeviceStatusHistory", "key": "device_status_history", "model": DSH,
         "columns": ["id", "device_id", "old_status", "new_status", "changed_by",
                     "reason", "created_at"]},
        {"name": "UserScopes", "key": "user_scopes", "model": UserScope,
         "columns": ["id", "user_id", "section", "scope", "created_at"]},
        # --- Attendance ---------------------------------------------------
        {
            # Added with the module rather than deferred: a restore that silently
            # drops a module's data is worse than not shipping the module.
            "name": "AttendanceDays",
            "key": "attendance_days",
            "model": AttendanceDay,
            "columns": [
                "id", "person_id", "day", "day_type", "project_id", "phase_id",
                "departed_at", "completed_at", "note", "logged_by",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "CompOffLedger",
            "key": "comp_off_ledger",
            "model": CompOffLedger,
            "columns": [
                "id", "person_id", "entry_type", "days", "source_day_id",
                "reason", "created_by", "created_at", "updated_at",
            ],
        },
        # --- Daily updates --------------------------------------------------
        {
            "name": "DailyUpdates",
            "key": "daily_updates",
            "model": DailyUpdate,
            "columns": [
                "id", "author_id", "person_id", "project_id", "body",
                "posted_for", "created_at", "updated_at",
            ],
        },
        {
            "name": "UpdateComments",
            "key": "update_comments",
            "model": UpdateComment,
            "columns": [
                "id", "update_id", "author_id", "body",
                "created_at", "updated_at",
            ],
        },
        # --- Projects -----------------------------------------------------
        # Everything below was missing from the export: a "full backup" covered
        # only devices/couples/pairs and their history, so projects, money and
        # assets were silently absent from every archive taken before 2026-08-09.
        {
            "name": "Projects",
            "key": "projects",
            "model": Project,
            "columns": [
                "id", "name", "project_type", "status", "customer_name",
                "site_location", "latitude", "longitude", "start_date", "end_date",
                "description", "custom_fields", "created_by",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "ProjectPhases",
            "key": "project_phases",
            "model": ProjectPhase,
            "columns": [
                "id", "project_id", "phase_type", "status", "started_at",
                "ended_at", "lead_person_id", "note", "created_at", "updated_at",
            ],
        },
        {
            "name": "ProjectMembers",
            "key": "project_members",
            "model": ProjectMember,
            "columns": [
                "id", "project_id", "person_id", "role_in_project", "phase_id",
                "joined_at", "left_at", "created_at", "updated_at",
            ],
        },
        {
            "name": "ProjectDeployments",
            "key": "project_deployments",
            "model": ProjectDeployment,
            "columns": [
                "id", "project_id", "entity_type", "entity_id", "deployed_at",
                "removed_at", "note", "created_by", "created_at", "updated_at",
            ],
        },
        {
            "name": "ProjectTimeline",
            "key": "project_timeline_entries",
            "model": ProjectTimelineEntry,
            "columns": [
                "id", "project_id", "entry_type", "title", "body", "entry_date",
                "created_by", "metadata_json", "created_at", "updated_at",
            ],
        },
        # --- Finance ------------------------------------------------------
        {
            "name": "Expenses",
            "key": "expenses",
            "model": Expense,
            "columns": [
                "id", "title", "amount", "currency", "expense_date", "category",
                "project_id", "batch_id", "claim_id", "added_by", "notes",
                "status", "paid_by", "paid_at", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "ExpenseBatches",
            "key": "expense_batches",
            "model": ExpenseBatch,
            "columns": ["id", "title", "notes", "created_by", "created_at", "updated_at"],
        },
        {
            "name": "ExpenseClaims",
            "key": "expense_claims",
            "model": ExpenseClaim,
            "columns": [
                "id", "title", "project_id", "submitted_by", "status", "note",
                "submitted_at", "settled_by", "settled_at", "created_at", "updated_at",
            ],
        },
        {
            "name": "ExpenseMembers",
            "key": "expense_members",
            "model": ExpenseMember,
            "columns": ["id", "expense_id", "person_id", "share_amount",
                        "created_at", "updated_at"],
        },
        {
            "name": "FundAllocations",
            "key": "fund_allocations",
            "model": FundAllocation,
            "columns": [
                "id", "person_id", "project_id", "amount", "currency",
                "received_date", "source_note", "logged_by",
                "created_at", "updated_at",
            ],
        },
        # --- Assets -------------------------------------------------------
        {
            "name": "Assets",
            "key": "assets",
            "model": Asset,
            "columns": [
                "id", "asset_code", "name", "category_id", "item_kind",
                "custody_type", "custody_id", "condition", "expected_return_date",
                "serial_number", "quantity", "current_project_id",
                "current_person_id", "device_id", "purchase_date", "purchase_price",
                "vendor_id", "notes", "tags", "tag_identifiers", "custom_fields",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "AssetCategories",
            "key": "asset_categories",
            "model": AssetCategory,
            "columns": ["id", "name", "parent_id", "sort_order", "created_at", "updated_at"],
        },
        {
            "name": "AssetHistory",
            "key": "asset_history",
            "model": AssetHistory,
            "columns": [
                "id", "asset_id", "event_type", "old_status", "new_status",
                "project_id", "person_id", "note", "performed_by", "occurred_at",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "AssetReports",
            "key": "asset_reports",
            "model": AssetReport,
            "columns": [
                "id", "report_type", "asset_id", "title", "details", "quantity",
                "created_at", "updated_at",
            ],
        },
        {
            "name": "ItemRequests",
            "key": "item_requests",
            "model": ItemRequest,
            "columns": [
                "id", "title", "details", "quantity", "needed_by", "status",
                "requested_by", "vendor_id", "estimated_cost", "status_note",
                "resolved_by", "resolved_at", "created_at", "updated_at",
            ],
        },
        # --- Documents ----------------------------------------------------
        # Metadata only. The files themselves live in MinIO and are not part of
        # this archive — back that up separately.
        {
            "name": "Documents",
            "key": "documents",
            "model": Document,
            "columns": [
                "id", "filename", "entity_type", "entity_id", "content_type",
                "size_bytes", "uploaded_by", "created_at", "updated_at",
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