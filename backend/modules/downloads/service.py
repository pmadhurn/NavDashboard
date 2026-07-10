import logging
import uuid as uuid_module
from typing import Optional
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from modules.documents.storage import MinIOStorage
from modules.downloads import repository
from modules.downloads.models import DownloadItem, DownloadVersion
from modules.downloads.schemas import (
    CategoryResponse,
    ItemListResponse,
    ItemResponse,
    ItemUpdate,
    VersionResponse,
)
from shared.audit import record_audit

logger = logging.getLogger(__name__)

VALID_ITEM_TYPES = {"FILE", "SOFTWARE"}
VALID_VISIBILITY = {"PUBLIC", "RESTRICTED"}


async def _item_to_response(db: AsyncSession, item: DownloadItem) -> ItemResponse:
    response = ItemResponse.model_validate(item)
    if item.visibility == "RESTRICTED":
        response.allowed_user_ids = await repository.get_access_user_ids(db, item.id)
    return response


async def list_items(
    db: AsyncSession,
    user_id: UUID,
    is_manager: bool,
    search: Optional[str],
    category_id: Optional[UUID],
    page: int,
    size: int,
) -> ItemListResponse:
    items, total = await repository.list_items(
        db,
        user_id=user_id,
        is_manager=is_manager,
        search=search,
        category_id=category_id,
        skip=(page - 1) * size,
        limit=size,
    )
    return ItemListResponse(
        items=[await _item_to_response(db, item) for item in items],
        total=total,
    )


async def get_item(
    db: AsyncSession, item_id: UUID, user_id: UUID, is_manager: bool
) -> ItemResponse:
    item = await repository.get_item(db, item_id)
    if not item:
        raise NotFoundException("Download item not found")
    if not await repository.user_can_access_item(db, item, user_id, is_manager):
        raise ForbiddenException("You don't have access to this item")
    return await _item_to_response(db, item)


async def upload(
    db: AsyncSession,
    storage: MinIOStorage,
    file: UploadFile,
    user_id: UUID,
    title: Optional[str],
    description: Optional[str],
    category_id: Optional[UUID],
    new_category: Optional[str],
    item_type: str,
    visibility: str,
    allowed_user_ids: list[UUID],
    existing_item_id: Optional[UUID],
    version_label: Optional[str],
    release_notes: Optional[str],
) -> ItemResponse:
    if item_type not in VALID_ITEM_TYPES:
        raise BadRequestException(f"item_type must be one of {sorted(VALID_ITEM_TYPES)}")
    if visibility not in VALID_VISIBILITY:
        raise BadRequestException(f"visibility must be one of {sorted(VALID_VISIBILITY)}")

    file_bytes = await file.read()
    if not file_bytes:
        raise BadRequestException("Uploaded file is empty")

    if new_category and not category_id:
        existing_cat = await repository.find_category_by_name(db, new_category.strip())
        category = existing_cat or await repository.create_category(db, new_category.strip())
        category_id = category.id

    if existing_item_id:
        item = await repository.get_item(db, existing_item_id)
        if not item:
            raise NotFoundException("Download item not found")
        if not await repository.user_can_access_item(db, item, user_id, is_manager=False):
            raise ForbiddenException("You don't have access to this item")
    else:
        item = DownloadItem(
            title=(title or file.filename or "Untitled").strip(),
            description=description,
            category_id=category_id,
            item_type=item_type,
            visibility=visibility,
            uploaded_by=user_id,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        if visibility == "RESTRICTED" and allowed_user_ids:
            await repository.set_access_users(db, item.id, allowed_user_ids)

    object_name = f"downloads/{uuid_module.uuid4()}_{file.filename}"
    await storage.ensure_bucket()
    await storage.upload_file(
        file_bytes, object_name, file.content_type or "application/octet-stream"
    )

    version = DownloadVersion(
        item_id=item.id,
        version_label=version_label,
        original_filename=file.filename or "file",
        storage_path=object_name,
        file_size=len(file_bytes),
        mime_type=file.content_type,
        release_notes=release_notes,
        uploaded_by=user_id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(item)

    await record_audit(
        db,
        action="CREATE",
        entity_type="download_item" if not existing_item_id else "download_version",
        entity_id=item.id,
        user_id=user_id,
        new_values={
            "title": item.title,
            "version": version_label,
            "filename": file.filename,
        },
    )
    return await _item_to_response(db, item)


async def update_item(
    db: AsyncSession,
    item_id: UUID,
    body: ItemUpdate,
    user_id: UUID,
    is_manager: bool,
) -> ItemResponse:
    item = await repository.get_item(db, item_id)
    if not item:
        raise NotFoundException("Download item not found")
    if not is_manager and item.uploaded_by != user_id:
        raise ForbiddenException("Only the uploader or a manager can edit this item")

    if body.item_type and body.item_type not in VALID_ITEM_TYPES:
        raise BadRequestException(f"item_type must be one of {sorted(VALID_ITEM_TYPES)}")
    if body.visibility and body.visibility not in VALID_VISIBILITY:
        raise BadRequestException(f"visibility must be one of {sorted(VALID_VISIBILITY)}")

    update_data = body.model_dump(exclude_unset=True, exclude={"allowed_user_ids"})
    for field, value in update_data.items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)

    if body.allowed_user_ids is not None:
        await repository.set_access_users(db, item.id, body.allowed_user_ids)

    await record_audit(
        db,
        action="UPDATE",
        entity_type="download_item",
        entity_id=item.id,
        user_id=user_id,
        new_values=update_data,
    )
    return await _item_to_response(db, item)


async def delete_item(
    db: AsyncSession,
    storage: MinIOStorage,
    item_id: UUID,
    user_id: UUID,
    is_manager: bool,
) -> None:
    item = await repository.get_item(db, item_id)
    if not item:
        raise NotFoundException("Download item not found")
    if not is_manager and item.uploaded_by != user_id:
        raise ForbiddenException("Only the uploader or a manager can delete this item")

    for version in item.versions:
        try:
            await storage.delete_file(version.storage_path)
        except Exception:
            logger.warning("Failed to delete file %s from storage", version.storage_path)

    await repository.soft_delete_item(db, item)
    await record_audit(
        db,
        action="DELETE",
        entity_type="download_item",
        entity_id=item.id,
        user_id=user_id,
        old_values={"title": item.title},
    )


async def download_version(
    db: AsyncSession,
    storage: MinIOStorage,
    version_id: UUID,
    user_id: UUID,
    is_manager: bool,
) -> tuple[DownloadVersion, bytes]:
    version = await repository.get_version(db, version_id)
    if not version:
        raise NotFoundException("Version not found")
    item = await repository.get_item(db, version.item_id)
    if not item:
        raise NotFoundException("Download item not found")
    if not await repository.user_can_access_item(db, item, user_id, is_manager):
        raise ForbiddenException("You don't have access to this item")

    file_bytes = await storage.download_file(version.storage_path)
    await repository.increment_download_count(db, version)
    return version, file_bytes


async def list_categories(db: AsyncSession) -> list[CategoryResponse]:
    categories = await repository.list_categories(db)
    return [CategoryResponse.model_validate(c) for c in categories]
