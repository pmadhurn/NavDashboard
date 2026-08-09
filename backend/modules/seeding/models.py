from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String, func, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class SeedRecord(Base):
    """Provenance for demo data.

    One row per entity created by the seeder. This exists so "remove seeded
    data" can delete *exactly* what the seeder made and nothing else.

    Before this table, seeded rows were indistinguishable from real ones —
    only `devices` left a trace, and only as a `"seed": True` flag buried in
    an audit_logs JSONB payload. Any "clear demo data" button built on that
    would have been a `DELETE FROM` against real records.

    Deliberately NOT foreign-keyed to the target rows: the entities live in a
    dozen different tables, and a hard FK would make deleting an entity fail
    while its provenance row still pointed at it.
    """

    __tablename__ = "seed_records"

    # Matches the keys in seeding.service.SEED_ORDER, e.g. "device", "project".
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entity_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    # Groups one run together so a single batch can be removed on its own.
    batch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    seeded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # "seeder" for rows this module created, "adopted" for pre-existing demo
    # rows registered retroactively.
    origin: Mapped[str] = mapped_column(String(20), default="seeder", nullable=False)


Index("ix_seed_records_type_entity", SeedRecord.entity_type, SeedRecord.entity_id, unique=True)
