from pydantic import BaseModel


class ModuleSeedStatus(BaseModel):
    entity_type: str
    table: str
    total_rows: int
    seeded_rows: int


class SeedStatusResponse(BaseModel):
    modules: list[ModuleSeedStatus]
    seeded_total: int
    # Rows present but not registered: demo data from before the registry
    # existed, or records entered by hand. Adopt would claim all of them.
    unregistered_total: int
    can_adopt: bool


class AdoptPreviewResponse(BaseModel):
    would_adopt: dict[str, int]
    total: int


class SeedResponse(BaseModel):
    batch_id: str
    created: dict[str, int]
    total: int


class AdoptResponse(BaseModel):
    batch_id: str
    adopted: dict[str, int]
    total: int


class UnseedResponse(BaseModel):
    removed: dict[str, int]
    total: int
