import io
import os
from datetime import datetime

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from core.exceptions import BadRequestException, NotFoundException
from modules.auth.models import User
from modules.backup import service
from modules.backup.schemas import BackupInfo, ExportRequest, ImportSummary

router = APIRouter()

BACKUP_DIR = "/backups"


@router.post("/pg-dump")
async def create_backup(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await service.create_backup_service(db, current_user.id)
    except RuntimeError as e:
        raise BadRequestException(str(e))


@router.get("/pg-dump/history")
async def backup_history(
    current_user: User = Depends(get_current_user),
):
    return await service.get_backup_history()


@router.get("/pg-dump/download/{filename}")
async def download_backup(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise NotFoundException(f"Backup file not found: {filename}")
    with open(filepath, "rb") as f:
        content = f.read()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/sql",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/pg-dump/restore")
async def restore_backup(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith((".sql", ".dump")):
        raise BadRequestException("Only .sql or .dump files are accepted")
    os.makedirs(BACKUP_DIR, exist_ok=True)
    filepath = os.path.join(BACKUP_DIR, file.filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    try:
        return await service.restore_backup_service(db, file.filename, current_user.id)
    except (RuntimeError, FileNotFoundError) as e:
        raise BadRequestException(str(e))


@router.delete("/pg-dump/{filename}")
async def delete_backup_file(
    filename: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.delete_backup_service(db, filename, current_user.id)


@router.post("/export/xlsx")
async def export_xlsx(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await service.export_data(db, "xlsx", request.tables, current_user.id)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="navdashboard_export_{timestamp}.xlsx"'
        },
    )


@router.post("/export/csv")
async def export_csv(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await service.export_data(db, "csv", request.tables, current_user.id)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="navdashboard_export_{timestamp}.zip"'
        },
    )


@router.post("/import/xlsx", response_model=ImportSummary)
async def import_xlsx(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise BadRequestException("Only .xlsx files are accepted")
    file_bytes = await file.read()
    result = await service.import_data(db, file_bytes, "xlsx", current_user.id)
    return result


@router.post("/import/csv", response_model=ImportSummary)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename or not file.filename.endswith((".csv", ".zip")):
        raise BadRequestException("Only .csv or .zip files are accepted")
    file_bytes = await file.read()
    result = await service.import_data(db, file_bytes, "csv", current_user.id)
    return result


@router.get("/table-counts")
async def table_counts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_table_counts_service(db)