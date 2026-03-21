import io
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.documents import service
from modules.documents.schemas import DocumentCreate, DocumentListResponse, DocumentResponse
from modules.documents.storage import MinIOStorage, get_storage

router = APIRouter()


def _safe_uuid(value: str | None) -> UUID | None:
    """Convert string to UUID, returning None for empty/invalid values."""
    if not value or not value.strip():
        return None
    try:
        return UUID(value.strip())
    except (ValueError, AttributeError):
        return None


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    entity_type: str | None = Form(None),
    entity_id: str | None = Form(None),
    description: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    metadata = DocumentCreate(
        entity_type=entity_type if entity_type and entity_type.strip() else None,
        entity_id=_safe_uuid(entity_id),
        description=description if description and description.strip() else None,
    )
    return await service.upload_document(db, file, metadata, current_user.id, storage)


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    entity_type: str | None = Query(None),
    entity_id: UUID | None = Query(None),
    file_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_documents(db, page, size, entity_type, entity_id, file_type)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    return await service.get_document(db, document_id, storage)


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    doc, file_bytes = await service.download_document(db, document_id, storage)
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}"'},
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    return await service.delete_document(db, document_id, current_user.id, storage)


@router.get("/by-entity/{entity_type}/{entity_id}", response_model=DocumentListResponse)
async def list_by_entity(
    entity_type: str,
    entity_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_by_entity(db, entity_type, entity_id, page, size)