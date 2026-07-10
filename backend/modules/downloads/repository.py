from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.downloads.models import (
    DownloadCategory,
    DownloadItem,
    DownloadItemAccess,
    DownloadVersion,
)


# --- Categories ---

async def list_categories(db: AsyncSession) -> list[DownloadCategory]:
    stmt = select(DownloadCategory).order_by(
        DownloadCategory.sort_order, DownloadCategory.name
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def find_category_by_name(db: AsyncSession, name: str) -> Optional[DownloadCategory]:
    stmt = select(DownloadCategory).where(func.lower(DownloadCategory.name) == name.lower())
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_category(db: AsyncSession, name: str, sort_order: int = 0) -> DownloadCategory:
    category = DownloadCategory(name=name, sort_order=sort_order)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category_id: UUID) -> bool:
    category = await db.get(DownloadCategory, category_id)
    if not category:
        return False
    # Detach items instead of deleting them
    stmt = select(DownloadItem).where(DownloadItem.category_id == category_id)
    result = await db.execute(stmt)
    for item in result.scalars().all():
        item.category_id = None
    await db.delete(category)
    await db.commit()
    return True


# --- Items ---

def _visibility_clause(user_id: UUID, is_manager: bool):
    """Items the user may see: public, own, or explicitly granted."""
    if is_manager:
        return None
    access_subquery = (
        select(DownloadItemAccess.item_id)
        .where(DownloadItemAccess.user_id == user_id)
        .scalar_subquery()
    )
    return or_(
        DownloadItem.visibility == "PUBLIC",
        DownloadItem.uploaded_by == user_id,
        DownloadItem.id.in_(access_subquery),
    )


async def list_items(
    db: AsyncSession,
    user_id: UUID,
    is_manager: bool,
    search: Optional[str] = None,
    category_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[DownloadItem], int]:
    stmt = select(DownloadItem).where(DownloadItem.deleted_at.is_(None))
    clause = _visibility_clause(user_id, is_manager)
    if clause is not None:
        stmt = stmt.where(clause)
    if search:
        stmt = stmt.where(DownloadItem.title.ilike(f"%{search}%"))
    if category_id:
        stmt = stmt.where(DownloadItem.category_id == category_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(DownloadItem.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_item(db: AsyncSession, item_id: UUID) -> Optional[DownloadItem]:
    stmt = select(DownloadItem).where(
        DownloadItem.id == item_id, DownloadItem.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def find_item_by_title(db: AsyncSession, title: str) -> Optional[DownloadItem]:
    stmt = select(DownloadItem).where(
        func.lower(DownloadItem.title) == title.lower(),
        DownloadItem.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def soft_delete_item(db: AsyncSession, item: DownloadItem) -> None:
    item.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Access ---

async def get_access_user_ids(db: AsyncSession, item_id: UUID) -> list[UUID]:
    stmt = select(DownloadItemAccess.user_id).where(DownloadItemAccess.item_id == item_id)
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def set_access_users(db: AsyncSession, item_id: UUID, user_ids: list[UUID]) -> None:
    stmt = select(DownloadItemAccess).where(DownloadItemAccess.item_id == item_id)
    result = await db.execute(stmt)
    existing = {row.user_id: row for row in result.scalars().all()}
    wanted = set(user_ids)
    for user_id in wanted - existing.keys():
        db.add(DownloadItemAccess(item_id=item_id, user_id=user_id))
    for user_id in existing.keys() - wanted:
        await db.delete(existing[user_id])
    await db.commit()


async def user_can_access_item(
    db: AsyncSession, item: DownloadItem, user_id: UUID, is_manager: bool
) -> bool:
    if is_manager or item.visibility == "PUBLIC" or item.uploaded_by == user_id:
        return True
    stmt = select(DownloadItemAccess).where(
        DownloadItemAccess.item_id == item.id,
        DownloadItemAccess.user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


# --- Versions ---

async def get_version(db: AsyncSession, version_id: UUID) -> Optional[DownloadVersion]:
    return await db.get(DownloadVersion, version_id)


async def increment_download_count(db: AsyncSession, version: DownloadVersion) -> None:
    version.download_count += 1
    await db.commit()
