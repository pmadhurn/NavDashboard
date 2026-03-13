from math import ceil
from typing import Generic, Type, TypeVar

from pydantic import BaseModel, Field
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T", bound=BaseModel)


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


async def paginate(
    db: AsyncSession,
    query: Select,
    params: PaginationParams,
    response_schema: Type[T],
) -> PaginatedResponse[T]:
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (params.page - 1) * params.size
    paginated_query = query.offset(offset).limit(params.size)
    result = await db.execute(paginated_query)
    rows = result.all()

    items = []
    for row in rows:
        obj = row[0] if len(row) == 1 else row
        if hasattr(obj, "__dict__") and hasattr(obj, "__table__"):
            items.append(response_schema.model_validate(obj, from_attributes=True))
        else:
            items.append(response_schema.model_validate(obj._mapping))

    pages = ceil(total / params.size) if params.size > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=params.page,
        size=params.size,
        pages=pages,
    )