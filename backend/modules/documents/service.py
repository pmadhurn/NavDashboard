import logging
import mimetypes
import os
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, NotFoundException
from modules.documents import repository
from modules.documents.models import Document
from modules.documents.schemas import DocumentCreate, DocumentListResponse, DocumentResponse
from modules.documents.storage import MinIOStorage
from shared.audit import record_audit

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    "pdf", "png", "jpg", "jpeg", "gif", "bmp", "svg",
    "doc", "docx", "xls", "xlsx", "csv", "txt",
    "zip", "json", "xml", "pptx", "odt", "ods",
}

FILE_TYPE_MAP = {
    "pdf": "pdf",
    "png": "image", "jpg": "image", "jpeg": "image", "gif": "image", "bmp": "image", "svg": "image",
    "doc": "document", "docx": "document", "txt": "document", "odt": "document",
    "xls": "spreadsheet", "xlsx": "spreadsheet", "csv": "spreadsheet", "ods": "spreadsheet",
    "pptx": "presentation",
    "zip": "archive", "json": "data", "xml": "data",
}


def _detect_file_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return FILE_TYPE_MAP.get(ext, "other")


def _detect_mime_type(filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def _build_response(doc: Document, download_url: str | None = None) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_type=doc.file_type,
        mime_type=doc.mime_type,
        file_size=doc.file_size,
        storage_path=doc.storage_path,
        entity_type=doc.entity_type,
        entity_id=doc.entity_id,
        uploaded_by=doc.uploaded_by,
        description=doc.description,
        created_at=doc.created_at,
        download_url=download_url,
    )


async def upload_document(
    db: AsyncSession,
    file: UploadFile,
    metadata: DocumentCreate,
    user_id: UUID,
    storage: MinIOStorage,
) -> DocumentResponse:
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise BadRequestException("Uploaded file is empty")

    original_filename = file.filename or "unknown"
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else ""
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise BadRequestException(f"File type '.{ext}' is not allowed")

    file_type = _detect_file_type(original_filename)
    mime_type = _detect_mime_type(original_filename)
    unique_id = uuid4()
    safe_filename = f"{unique_id}_{original_filename}"

    if metadata.entity_type and metadata.entity_id:
        storage_path = f"{metadata.entity_type}/{metadata.entity_id}/{safe_filename}"
    else:
        storage_path = f"general/{safe_filename}"

    try:
        await storage.ensure_bucket()
        await storage.upload_file(file_bytes, storage_path, mime_type)
    except Exception as e:
        logger.error(f"MinIO upload failed: {e}")
        raise BadRequestException(f"File storage unavailable: {str(e)}")

    document = Document(
        filename=safe_filename,
        original_filename=original_filename,
        file_type=file_type,
        mime_type=mime_type,
        file_size=len(file_bytes),
        storage_path=storage_path,
        entity_type=metadata.entity_type,
        entity_id=metadata.entity_id,
        uploaded_by=user_id,
        description=metadata.description,
    )

    document = await repository.create(db, document)

    await record_audit(
        db=db,
        action="CREATE",
        entity_type="document",
        entity_id=document.id,
        user_id=user_id,
        new_values={
            "filename": original_filename,
            "file_type": file_type,
            "file_size": len(file_bytes),
            "entity_type": metadata.entity_type,
        },
    )

    download_url = f"/api/v1/documents/{document.id}/download"
    return _build_response(document, download_url)


async def get_document(
    db: AsyncSession,
    document_id: UUID,
    storage: MinIOStorage,
) -> DocumentResponse:
    doc = await repository.get_by_id(db, document_id)
    if not doc:
        raise NotFoundException("Document not found")

    download_url = f"/api/v1/documents/{doc.id}/download"
    return _build_response(doc, download_url)


async def download_document(
    db: AsyncSession,
    document_id: UUID,
    storage: MinIOStorage,
) -> tuple[Document, bytes]:
    doc = await repository.get_by_id(db, document_id)
    if not doc:
        raise NotFoundException("Document not found")

    try:
        file_bytes = await storage.download_file(doc.storage_path)
    except Exception as e:
        logger.error(f"MinIO download failed: {e}")
        raise BadRequestException(f"File storage unavailable: {str(e)}")

    return doc, file_bytes


async def delete_document(
    db: AsyncSession,
    document_id: UUID,
    user_id: UUID,
    storage: MinIOStorage,
) -> dict:
    doc = await repository.get_by_id(db, document_id)
    if not doc:
        raise NotFoundException("Document not found")

    await repository.soft_delete(db, doc)

    try:
        await storage.delete_file(doc.storage_path)
    except Exception as e:
        logger.warning(f"Failed to delete file from MinIO: {e}")

    await record_audit(
        db=db,
        action="DELETE",
        entity_type="document",
        entity_id=doc.id,
        user_id=user_id,
        old_values={"filename": doc.original_filename},
    )

    return {"detail": "Document deleted"}


async def list_documents(
    db: AsyncSession,
    page: int = 1,
    size: int = 20,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    file_type: str | None = None,
) -> DocumentListResponse:
    skip = (page - 1) * size
    items, total = await repository.get_multi(
        db, skip=skip, limit=size,
        entity_type=entity_type, entity_id=entity_id, file_type=file_type,
    )
    pages = max(1, -(-total // size))

    return DocumentListResponse(
        items=[
            _build_response(doc, f"/api/v1/documents/{doc.id}/download")
            for doc in items
        ],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


async def list_by_entity(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    page: int = 1,
    size: int = 20,
) -> DocumentListResponse:
    skip = (page - 1) * size
    items, total = await repository.get_by_entity(
        db, entity_type=entity_type, entity_id=entity_id,
        skip=skip, limit=size,
    )
    pages = max(1, -(-total // size))

    return DocumentListResponse(
        items=[
            _build_response(doc, f"/api/v1/documents/{doc.id}/download")
            for doc in items
        ],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )