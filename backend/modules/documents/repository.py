import math
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.documents.models import Document


async def get_by_id(db: AsyncSession, document_id: UUID) -> Optional[Document]:
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_multi(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    file_type: Optional[str] = None,
) -> tuple[list[Document], int]:
    stmt = select(Document).where(Document.deleted_at.is_(None))

    if entity_type:
        stmt = stmt.where(Document.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(Document.entity_id == entity_id)
    if file_type:
        stmt = stmt.where(Document.file_type == file_type)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return items, total


async def get_by_entity(
    db: AsyncSession,
    entity_type: str,
    entity_id: UUID,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[Document], int]:
    stmt = select(Document).where(
        Document.deleted_at.is_(None),
        Document.entity_type == entity_type,
        Document.entity_id == entity_id,
    )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    stmt = stmt.order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return items, total


async def create(db: AsyncSession, document: Document) -> Document:
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


async def soft_delete(db: AsyncSession, document: Document) -> Document:
    from datetime import datetime, timezone

    document.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(document)
    return document