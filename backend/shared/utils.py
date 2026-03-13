import re
import unicodedata
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import inspect as sa_inspect


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug.
    Example: 'Hello World!' → 'hello-world'"""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text


def generate_serial(prefix: str, number: int) -> str:
    """Generate serial number like 'IU-00042'.
    prefix='IU', number=42 → 'IU-00042'"""
    return f"{prefix}-{number:05d}"


def format_datetime(dt: datetime | None) -> str | None:
    """Format datetime to ISO 8601 string or return None."""
    if dt is None:
        return None
    return dt.isoformat()


def model_to_dict(instance: Any, exclude: set[str] | None = None) -> dict:
    """Convert SQLAlchemy model instance to dict.
    Handles UUID→str and datetime→ISO string serialization.
    Excludes specified keys. Uses SQLAlchemy inspection."""
    if exclude is None:
        exclude = set()

    mapper = sa_inspect(type(instance))
    result = {}
    for column in mapper.columns:
        key = column.key
        if key in exclude:
            continue
        value = getattr(instance, key, None)
        if isinstance(value, UUID):
            value = str(value)
        elif isinstance(value, datetime):
            value = value.isoformat()
        result[key] = value
    return result