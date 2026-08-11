import io
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from core.permissions import LEVEL_MANAGE, level_satisfies
from modules.auth.models import User
from modules.documents.storage import MinIOStorage, get_storage
from modules.downloads import service
from modules.downloads.schemas import (
    CategoryCreate,
    CategoryResponse,
    ItemListResponse,
    ItemResponse,
    ItemUpdate,
)

router = APIRouter()


async def _is_manager(db: AsyncSession, user: User) -> bool:
    """Managing the archive (categories, per-item access) rather than downloading from it."""
    from core.authz import user_has

    return await user_has(db, user, "downloads.categories")


def _parse_uuid_list(raw: Optional[str]) -> list[UUID]:
    if not raw or not raw.strip():
        return []
    return [UUID(part.strip()) for part in raw.split(",") if part.strip()]


@router.get("/", response_model=ItemListResponse)
async def list_items(
    search: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_items(
        db,
        user_id=current_user.id,
        is_manager=await _is_manager(db, current_user),
        search=search,
        category_id=category_id,
        page=page,
        size=size,
    )


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_categories(db)


@router.post("/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from modules.downloads import repository

    existing = await repository.find_category_by_name(db, body.name)
    if existing:
        return existing
    return await repository.create_category(db, body.name, body.sort_order)


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from core.exceptions import NotFoundException
    from modules.downloads import repository

    if not await repository.delete_category(db, category_id):
        raise NotFoundException("Category not found")
    return {"detail": "Category deleted"}


@router.post("/upload", response_model=ItemResponse, status_code=201)
async def upload(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category_id: Optional[UUID] = Form(None),
    new_category: Optional[str] = Form(None),
    item_type: str = Form("FILE"),
    visibility: str = Form("PUBLIC"),
    allowed_user_ids: Optional[str] = Form(None),
    existing_item_id: Optional[UUID] = Form(None),
    version_label: Optional[str] = Form(None),
    release_notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    return await service.upload(
        db,
        storage,
        file,
        user_id=current_user.id,
        title=title,
        description=description,
        category_id=category_id,
        new_category=new_category,
        item_type=item_type,
        visibility=visibility,
        allowed_user_ids=_parse_uuid_list(allowed_user_ids),
        existing_item_id=existing_item_id,
        version_label=version_label,
        release_notes=release_notes,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_item(
        db, item_id, current_user.id, await _is_manager(db, current_user)
    )


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    body: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_item(
        db, item_id, body, current_user.id, await _is_manager(db, current_user)
    )


@router.delete("/{item_id}")
async def delete_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    await service.delete_item(
        db, storage, item_id, current_user.id, await _is_manager(db, current_user)
    )
    return {"detail": "Item deleted"}


@router.get("/versions/{version_id}/download")
async def download_version(
    version_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    version, file_bytes = await service.download_version(
        db, storage, version_id, current_user.id, await _is_manager(db, current_user)
    )
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=version.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{version.original_filename}"'
        },
    )
