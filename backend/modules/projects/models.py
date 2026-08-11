from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base, CustomFieldsMixin, SoftDeleteMixin


class Project(Base, SoftDeleteMixin, CustomFieldsMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(300), nullable=False)
    project_type: Mapped[str] = mapped_column(String(20), default="POC", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False, index=True)
    customer_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    site_location: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    members = relationship("ProjectMember", lazy="selectin", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False
    )
    person_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=False
    )
    role_in_project: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phase_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="members")
    person = relationship("Person", lazy="selectin")


class ProjectTimelineEntry(Base):
    """Append-only activity log: visits, calls, notes, plus auto system events."""

    __tablename__ = "project_timeline_entries"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False
    )
    entry_type: Mapped[str] = mapped_column(String(30), default="NOTE", nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entry_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    created_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)


class ProjectDeployment(Base):
    """Links a project to a deployed device/couple/pair/asset at its site.
    Answers 'which links are deployed at this project' and the reverse."""

    __tablename__ = "project_deployments"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False)  # device|couple|pair|asset
    entity_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), index=True, nullable=False)
    deployed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    removed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)


class ProjectPhase(Base, SoftDeleteMixin):
    """A stage of a project (desktop survey → physical survey → installation …),
    each potentially with its own lead + team + equipment movements."""

    __tablename__ = "project_phases"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False
    )
    phase_type: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    lead_person_id: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class EquipmentMovement(Base):
    __tablename__ = "equipment_movements"

    project_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("projects.id"), index=True, nullable=False
    )
    phase_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # OUTWARD | INWARD
    movement_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    handled_by: Mapped[Optional[UUID]] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("personnel.id"), nullable=True
    )
    received_by_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False)

    items = relationship("EquipmentMovementItem", lazy="selectin", back_populates="movement")
    handler = relationship("Person", lazy="selectin")


class EquipmentMovementItem(Base):
    __tablename__ = "equipment_movement_items"

    movement_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("equipment_movements.id"), index=True, nullable=False
    )
    asset_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("assets.id"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    condition_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # For outward items: RETURNED | WITH_CLIENT | DAMAGED | LOST (updated on inward)
    # How this line was resolved when the team came back. Distinct from
    # item_status: "not returned" is never the same as "missing".
    return_outcome: Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    outcome_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    item_status: Mapped[str] = mapped_column(String(20), default="WITH_CLIENT", nullable=False)

    movement = relationship("EquipmentMovement", back_populates="items")
    asset = relationship("Asset", lazy="selectin")
