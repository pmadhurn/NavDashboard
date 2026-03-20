from pydantic import BaseModel
from uuid import UUID
from typing import Any, Optional


class ComparisonField(BaseModel):
    field_name: str
    label: str
    value_a: Any
    value_b: Any
    match: bool


class ComparisonResult(BaseModel):
    entity_type: str
    entity_a_id: UUID
    entity_a_name: str
    entity_b_id: UUID
    entity_b_name: str
    fields: list[ComparisonField]
    match_count: int
    diff_count: int
    nested_comparisons: Optional[dict[str, list[ComparisonField]]] = None


class CompareRequest(BaseModel):
    entity_id_1: UUID
    entity_id_2: UUID