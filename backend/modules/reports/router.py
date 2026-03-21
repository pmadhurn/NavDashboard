import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.reports import service
from modules.reports.schemas import ReportRequest, ReportTemplate

router = APIRouter()


@router.get("/templates", response_model=list[ReportTemplate])
async def list_templates(
    current_user: User = Depends(get_current_user),
):
    return service.get_templates()


@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes, filename, content_type = await service.generate_report(
        db, request, current_user.id
    )
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
    