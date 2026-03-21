import logging
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException
from modules.reports.generators import (
    generate_device_inventory_pdf,
    generate_device_inventory_xlsx,
    generate_error_summary_pdf,
    generate_error_summary_xlsx,
    generate_full_system_pdf,
    generate_full_system_xlsx,
    generate_location_history_pdf,
    generate_location_history_xlsx,
    generate_pair_status_pdf,
    generate_pair_status_xlsx,
)
from modules.reports.schemas import ReportRequest, ReportTemplate
from shared.audit import record_audit

logger = logging.getLogger(__name__)

REPORT_TEMPLATES = [
    {
        "id": "device_inventory",
        "name": "Device Inventory",
        "description": "Complete inventory of all LiFi devices with status and assignments",
        "parameters": ["date_from", "date_to"],
    },
    {
        "id": "error_summary",
        "name": "Error Summary",
        "description": "Summary of all errors and troubleshooting activities",
        "parameters": ["date_from", "date_to"],
    },
    {
        "id": "location_history",
        "name": "Location History",
        "description": "Movement history of all couples with distance tracking",
        "parameters": ["date_from", "date_to"],
    },
    {
        "id": "pair_status",
        "name": "Pair Status Report",
        "description": "Current status of all pairs and their associated couples",
        "parameters": [],
    },
    {
        "id": "full_system",
        "name": "Full System Report",
        "description": "Comprehensive report of the entire NavDashboard system",
        "parameters": ["date_from", "date_to"],
    },
]

GENERATOR_MAP = {
    ("device_inventory", "pdf"): generate_device_inventory_pdf,
    ("device_inventory", "xlsx"): generate_device_inventory_xlsx,
    ("error_summary", "pdf"): generate_error_summary_pdf,
    ("error_summary", "xlsx"): generate_error_summary_xlsx,
    ("location_history", "pdf"): generate_location_history_pdf,
    ("location_history", "xlsx"): generate_location_history_xlsx,
    ("pair_status", "pdf"): generate_pair_status_pdf,
    ("pair_status", "xlsx"): generate_pair_status_xlsx,
    ("full_system", "pdf"): generate_full_system_pdf,
    ("full_system", "xlsx"): generate_full_system_xlsx,
}


def get_templates() -> list[ReportTemplate]:
    return [ReportTemplate(**t) for t in REPORT_TEMPLATES]


async def generate_report(
    db: AsyncSession,
    request: ReportRequest,
    user_id: UUID,
) -> tuple[bytes, str, str]:
    """Generate report. Returns (file_bytes, filename, content_type)."""
    generator = GENERATOR_MAP.get((request.template_id, request.format))
    if not generator:
        raise BadRequestException(
            f"Unknown report: template_id='{request.template_id}', format='{request.format}'"
        )

    file_bytes = await generator(
        db,
        date_from=request.date_from,
        date_to=request.date_to,
        entity_ids=request.entity_ids,
    )

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    if request.format == "pdf":
        filename = f"navdashboard_{request.template_id}_{timestamp}.pdf"
        content_type = "application/pdf"
    else:
        filename = f"navdashboard_{request.template_id}_{timestamp}.xlsx"
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    await record_audit(
        db=db,
        action="REPORT_GENERATE",
        entity_type="report",
        entity_id=uuid4(),
        user_id=user_id,
        new_values={
            "template_id": request.template_id,
            "format": request.format,
            "filename": filename,
        },
    )

    return file_bytes, filename, content_type