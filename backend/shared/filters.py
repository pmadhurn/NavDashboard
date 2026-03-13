from typing import Any

from sqlalchemy import Select


def apply_filters(
    query: Select,
    model: Any,
    filters: dict[str, Any],
) -> Select:
    for key, value in filters.items():
        if value is None:
            continue

        parts = key.split("__")
        field_name = parts[0]
        suffix = parts[1] if len(parts) > 1 else None

        column = getattr(model, field_name, None)
        if column is None:
            continue

        if suffix is None:
            query = query.where(column == value)
        elif suffix == "contains":
            query = query.where(column.ilike(f"%{value}%"))
        elif suffix == "gte":
            query = query.where(column >= value)
        elif suffix == "lte":
            query = query.where(column <= value)
        elif suffix == "in":
            query = query.where(column.in_(value))
        elif suffix == "isnull":
            if value:
                query = query.where(column.is_(None))
            else:
                query = query.where(column.isnot(None))

    return query