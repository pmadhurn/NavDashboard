from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.assets.models import Asset
from modules.assets.service import record_asset_event
from modules.personnel.models import Person
from modules.projects.models import (
    EquipmentMovement,
    EquipmentMovementItem,
    Project,
    ProjectDeployment,
    ProjectMember,
    ProjectPhase,
    ProjectTimelineEntry,
)
from modules.projects.schemas import (
    ItemReturn,
    MemberAdd,
    MemberResponse,
    MovementCreate,
    MovementResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectSummary,
    ProjectUpdate,
    TimelineEntryCreate,
    TimelineEntryResponse,
)
from shared.audit import record_audit
from shared.pagination import PaginatedResponse, PaginationParams, paginate

VALID_TYPES = {"POC", "DEMO", "INSTALLATION", "OTHER"}
VALID_STATUSES = {"ACTIVE", "ON_HOLD", "COMPLETED", "CLOSED"}
VALID_ENTRY_TYPES = {
    "VISIT", "CALL", "NOTE", "STATUS_CHANGE", "EQUIPMENT", "DOCUMENT", "ISSUE", "EXPENSE",
}
VALID_ITEM_STATUSES = {"RETURNED", "WITH_CLIENT", "DAMAGED", "LOST"}
VALID_DEPLOYMENT_TYPES = {"device", "couple", "pair", "asset"}


async def _resolve_entity_label(db: AsyncSession, entity_type: str, entity_id) -> tuple:
    """Return (label, sub) describing a deployed entity for display."""
    try:
        if entity_type == "device":
            from modules.devices.models import Device

            d = await db.get(Device, entity_id)
            return (d.serial_number, d.device_type) if d else (None, None)
        if entity_type == "couple":
            from modules.couples.models import Couple

            c = await db.get(Couple, entity_id)
            return (c.name, c.status) if c else (None, None)
        if entity_type == "pair":
            from modules.pairs.models import Pair

            p = await db.get(Pair, entity_id)
            return (p.name, p.status) if p else (None, None)
        if entity_type == "asset":
            from modules.assets.models import Asset

            a = await db.get(Asset, entity_id)
            return (f"{a.asset_code} {a.name}", a.status) if a else (None, None)
    except Exception:
        pass
    return (None, None)


async def add_timeline_event(
    db: AsyncSession,
    project_id: UUID,
    entry_type: str,
    title: str,
    body: Optional[str] = None,
    created_by: Optional[UUID] = None,
    metadata: Optional[dict] = None,
) -> ProjectTimelineEntry:
    """Append an entry to a project timeline (also used by other modules)."""
    entry = ProjectTimelineEntry(
        project_id=project_id,
        entry_type=entry_type,
        title=title,
        body=body,
        created_by=created_by,
        metadata_json=metadata,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


# --- Projects ---

async def list_projects(
    db: AsyncSession,
    params: PaginationParams,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
) -> PaginatedResponse[ProjectResponse]:
    stmt = select(Project).where(Project.deleted_at.is_(None))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Project.name.ilike(like),
                Project.customer_name.ilike(like),
                Project.site_location.ilike(like),
            )
        )
    if project_type:
        stmt = stmt.where(Project.project_type == project_type)
    if status:
        stmt = stmt.where(Project.status == status)
    stmt = stmt.order_by(Project.created_at.desc())
    return await paginate(db, stmt, params, ProjectResponse)


async def get_project(db: AsyncSession, project_id: UUID) -> Project:
    stmt = select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
    project = (await db.execute(stmt)).scalar_one_or_none()
    if not project:
        raise NotFoundException("Project not found")
    return project


async def create_project(db: AsyncSession, body: ProjectCreate, user_id: UUID) -> ProjectResponse:
    if body.project_type not in VALID_TYPES:
        raise BadRequestException(f"project_type must be one of {sorted(VALID_TYPES)}")

    project = Project(
        name=body.name,
        project_type=body.project_type,
        customer_name=body.customer_name,
        site_location=body.site_location,
        latitude=body.latitude,
        longitude=body.longitude,
        start_date=body.start_date,
        description=body.description,
        created_by=user_id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    await add_timeline_event(
        db, project.id, "NOTE", "Project created", created_by=user_id
    )
    await record_audit(
        db,
        action="CREATE",
        entity_type="project",
        entity_id=project.id,
        user_id=user_id,
        new_values={"name": project.name, "type": project.project_type},
    )
    return ProjectResponse.model_validate(project)


async def update_project(
    db: AsyncSession, project_id: UUID, body: ProjectUpdate, user_id: UUID
) -> ProjectResponse:
    project = await get_project(db, project_id)

    if body.project_type and body.project_type not in VALID_TYPES:
        raise BadRequestException(f"project_type must be one of {sorted(VALID_TYPES)}")
    if body.status and body.status not in VALID_STATUSES:
        raise BadRequestException(f"status must be one of {sorted(VALID_STATUSES)}")

    old_status = project.status
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)

    if body.status and body.status != old_status:
        await add_timeline_event(
            db,
            project.id,
            "STATUS_CHANGE",
            f"Status changed: {old_status} → {body.status}",
            created_by=user_id,
        )

    await record_audit(
        db,
        action="UPDATE",
        entity_type="project",
        entity_id=project.id,
        user_id=user_id,
        new_values={k: str(v) for k, v in update_data.items()},
    )
    return ProjectResponse.model_validate(project)


async def delete_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> None:
    project = await get_project(db, project_id)
    project.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await record_audit(
        db,
        action="DELETE",
        entity_type="project",
        entity_id=project.id,
        user_id=user_id,
        old_values={"name": project.name},
    )


async def get_summary(db: AsyncSession, project_id: UUID) -> ProjectSummary:
    project = await get_project(db, project_id)

    out_stmt = (
        select(func.count())
        .select_from(EquipmentMovementItem)
        .join(EquipmentMovement, EquipmentMovementItem.movement_id == EquipmentMovement.id)
        .where(
            EquipmentMovement.project_id == project_id,
            EquipmentMovement.direction == "OUTWARD",
            EquipmentMovementItem.item_status == "WITH_CLIENT",
        )
    )
    equipment_out = (await db.execute(out_stmt)).scalar_one()

    last_stmt = select(func.max(ProjectTimelineEntry.entry_date)).where(
        ProjectTimelineEntry.project_id == project_id
    )
    last_activity = (await db.execute(last_stmt)).scalar_one_or_none()

    return ProjectSummary(
        equipment_out=equipment_out,
        last_activity=last_activity,
        member_count=len([m for m in project.members if m.left_at is None]),
    )


# --- Members ---

async def add_member(
    db: AsyncSession, project_id: UUID, body: MemberAdd, user_id: UUID
) -> MemberResponse:
    project = await get_project(db, project_id)

    person_id = body.person_id
    if not person_id:
        if not body.new_person_name:
            raise BadRequestException("Provide person_id or new_person_name")
        person = Person(
            full_name=body.new_person_name.strip(),
            role=body.new_person_role or "Team Member",
        )
        db.add(person)
        await db.commit()
        await db.refresh(person)
        person_id = person.id

    member = ProjectMember(
        project_id=project.id,
        person_id=person_id,
        role_in_project=body.role_in_project,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    await add_timeline_event(
        db,
        project.id,
        "NOTE",
        f"{member.person.full_name} joined the team",
        created_by=user_id,
    )
    return MemberResponse.model_validate(member)


async def remove_member(db: AsyncSession, project_id: UUID, member_id: UUID, user_id: UUID) -> None:
    member = await db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise NotFoundException("Member not found")
    member.left_at = datetime.now(timezone.utc)
    await db.commit()


async def move_member(db: AsyncSession, project_id: UUID, member_id: UUID, body, user_id: UUID):
    """Move a member to another project: leave here, join there — one action."""
    member = await db.get(ProjectMember, member_id)
    if not member or member.project_id != project_id:
        raise NotFoundException("Member not found")
    target = await get_project(db, body.target_project_id)

    member.left_at = datetime.now(timezone.utc)
    new_member = ProjectMember(
        project_id=target.id,
        person_id=member.person_id,
        role_in_project=body.role_in_project or member.role_in_project,
    )
    db.add(new_member)
    await db.commit()
    await db.refresh(new_member)

    person_name = new_member.person.full_name if new_member.person else "A member"
    src = await db.get(Project, project_id)
    await add_timeline_event(
        db, project_id, "NOTE",
        f"{person_name} moved to {target.name}", created_by=user_id,
    )
    await add_timeline_event(
        db, target.id, "NOTE",
        f"{person_name} joined from {src.name if src else 'another project'}",
        created_by=user_id,
    )
    return MemberResponse.model_validate(new_member)


# --- Phases ---

VALID_PHASE_TYPES = {
    "DESKTOP_SURVEY", "PHYSICAL_SURVEY", "INSTALLATION", "MAINTENANCE", "OTHER",
}


async def list_phases(db: AsyncSession, project_id: UUID):
    from modules.projects.schemas import PhaseResponse

    await get_project(db, project_id)
    stmt = (
        select(ProjectPhase)
        .where(ProjectPhase.project_id == project_id, ProjectPhase.deleted_at.is_(None))
        .order_by(ProjectPhase.created_at)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [PhaseResponse.model_validate(p) for p in rows]


async def create_phase(db: AsyncSession, project_id: UUID, body, user_id: UUID):
    from modules.projects.schemas import PhaseResponse

    project = await get_project(db, project_id)
    if body.phase_type not in VALID_PHASE_TYPES:
        raise BadRequestException(f"phase_type must be one of {sorted(VALID_PHASE_TYPES)}")
    phase = ProjectPhase(
        project_id=project.id,
        phase_type=body.phase_type,
        status="ACTIVE",
        started_at=datetime.now(timezone.utc),
        lead_person_id=body.lead_person_id,
        note=body.note,
    )
    db.add(phase)
    await db.commit()
    await db.refresh(phase)
    await add_timeline_event(
        db, project.id, "STATUS_CHANGE",
        f"Phase started: {body.phase_type.replace('_', ' ').title()}",
        created_by=user_id,
    )
    return PhaseResponse.model_validate(phase)


async def update_phase(db: AsyncSession, phase_id: UUID, body, user_id: UUID):
    from modules.projects.schemas import PhaseResponse

    phase = await db.get(ProjectPhase, phase_id)
    if not phase or phase.deleted_at is not None:
        raise NotFoundException("Phase not found")
    if body.status:
        phase.status = body.status
        if body.status == "COMPLETED":
            phase.ended_at = datetime.now(timezone.utc)
    if body.lead_person_id is not None:
        phase.lead_person_id = body.lead_person_id
    if body.note is not None:
        phase.note = body.note
    await db.commit()
    await db.refresh(phase)
    return PhaseResponse.model_validate(phase)


async def close_project(db: AsyncSession, project_id: UUID, body, user_id: UUID):
    """Close a project: mark departing members and ensure equipment is reconciled."""
    project = await get_project(db, project_id)

    # Outstanding equipment still with client on this project
    out_stmt = (
        select(func.count())
        .select_from(EquipmentMovementItem)
        .join(EquipmentMovement, EquipmentMovementItem.movement_id == EquipmentMovement.id)
        .where(
            EquipmentMovement.project_id == project_id,
            EquipmentMovementItem.item_status == "WITH_CLIENT",
        )
    )
    outstanding = (await db.execute(out_stmt)).scalar_one()
    if outstanding and not body.force:
        raise ConflictException(
            f"{outstanding} item(s) are still out. Receive them back (inward) or force-close."
        )

    for member_id in body.departing_member_ids:
        member = await db.get(ProjectMember, member_id)
        if member and member.project_id == project_id and member.left_at is None:
            member.left_at = datetime.now(timezone.utc)

    project.status = "CLOSED"
    project.end_date = datetime.now(timezone.utc)
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    await add_timeline_event(
        db, project.id, "STATUS_CHANGE", "Project closed", created_by=user_id
    )
    return ProjectResponse.model_validate(project)


# --- Timeline ---

async def list_timeline(
    db: AsyncSession,
    project_id: UUID,
    params: PaginationParams,
    entry_type: Optional[str] = None,
) -> PaginatedResponse[TimelineEntryResponse]:
    await get_project(db, project_id)
    stmt = select(ProjectTimelineEntry).where(ProjectTimelineEntry.project_id == project_id)
    if entry_type:
        stmt = stmt.where(ProjectTimelineEntry.entry_type == entry_type)
    stmt = stmt.order_by(ProjectTimelineEntry.entry_date.desc())
    return await paginate(db, stmt, params, TimelineEntryResponse)


async def create_timeline_entry(
    db: AsyncSession, project_id: UUID, body: TimelineEntryCreate, user_id: UUID
) -> TimelineEntryResponse:
    await get_project(db, project_id)
    if body.entry_type not in VALID_ENTRY_TYPES:
        raise BadRequestException(f"entry_type must be one of {sorted(VALID_ENTRY_TYPES)}")

    entry = ProjectTimelineEntry(
        project_id=project_id,
        entry_type=body.entry_type,
        title=body.title,
        body=body.body,
        created_by=user_id,
    )
    if body.entry_date:
        entry.entry_date = body.entry_date
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return TimelineEntryResponse.model_validate(entry)


# --- Equipment movements ---

async def list_movements(db: AsyncSession, project_id: UUID) -> list[MovementResponse]:
    await get_project(db, project_id)
    stmt = (
        select(EquipmentMovement)
        .where(EquipmentMovement.project_id == project_id)
        .order_by(EquipmentMovement.movement_date.desc())
    )
    result = await db.execute(stmt)
    return [MovementResponse.model_validate(m) for m in result.scalars().all()]


async def create_movement(
    db: AsyncSession, project_id: UUID, body: MovementCreate, user_id: UUID
) -> MovementResponse:
    project = await get_project(db, project_id)
    if body.direction not in {"OUTWARD", "INWARD"}:
        raise BadRequestException("direction must be OUTWARD or INWARD")
    if not body.items:
        raise BadRequestException("Add at least one item to the movement")

    movement = EquipmentMovement(
        project_id=project.id,
        direction=body.direction,
        handled_by=body.handled_by,
        received_by_name=body.received_by_name,
        notes=body.notes,
        created_by=user_id,
    )
    if body.movement_date:
        movement.movement_date = body.movement_date
    db.add(movement)
    await db.commit()
    await db.refresh(movement)

    outward = body.direction == "OUTWARD"
    for item_in in body.items:
        asset = await db.get(Asset, item_in.asset_id)
        if not asset or asset.deleted_at is not None:
            raise NotFoundException(f"Asset {item_in.asset_id} not found")

        db.add(
            EquipmentMovementItem(
                movement_id=movement.id,
                asset_id=asset.id,
                quantity=item_in.quantity,
                condition_note=item_in.condition_note,
                item_status="WITH_CLIENT" if outward else "RETURNED",
            )
        )

        old_status = asset.status
        if outward:
            asset.status = "WITH_PROJECT"
            asset.current_project_id = project.id
        else:
            asset.status = "IN_OFFICE"
            asset.current_project_id = None
        await db.commit()
        await record_asset_event(
            db,
            asset.id,
            "OUTWARD" if outward else "INWARD",
            user_id,
            old_status=old_status,
            new_status=asset.status,
            project_id=project.id,
            note=item_in.condition_note,
        )

    await db.refresh(movement)
    item_names = ", ".join(
        f"{i.asset.asset_code}" for i in movement.items
    )
    await add_timeline_event(
        db,
        project.id,
        "EQUIPMENT",
        f"Equipment {'sent out' if outward else 'received back'}: {item_names}",
        created_by=user_id,
    )
    return MovementResponse.model_validate(movement)


# --- Outward form + inventory conflict engine ---

async def preview_outward(db: AsyncSession, project_id: UUID, items: list):
    """Analyse an outward form against live inventory without writing anything.
    Flags NEW_ITEM (not in inventory) and INSUFFICIENT (qty > available)."""
    from modules.assets.models import Asset
    from modules.assets.service import available_quantity
    from modules.projects.schemas import OutwardLineResult, OutwardPreview

    await get_project(db, project_id)
    results = []
    has_conflicts = False
    for i, line in enumerate(items):
        qty = max(1, line.quantity or 1)
        if line.asset_id:
            asset = await db.get(Asset, line.asset_id)
            if not asset or asset.deleted_at is not None:
                results.append(OutwardLineResult(
                    index=i, label=line.name or str(line.asset_id), requested=qty,
                    available=0, conflict="NEW_ITEM", message="Asset not found",
                ))
                has_conflicts = True
                continue
            avail = await available_quantity(db, asset)
            conflict = "INSUFFICIENT" if qty > avail else "NONE"
            if conflict != "NONE":
                has_conflicts = True
            results.append(OutwardLineResult(
                index=i, asset_id=asset.id, label=f"{asset.asset_code} {asset.name}",
                requested=qty, available=avail, conflict=conflict,
                message=(f"Only {avail} in stock" if conflict == "INSUFFICIENT" else None),
            ))
        else:
            has_conflicts = True
            results.append(OutwardLineResult(
                index=i, label=(line.name or "Unnamed item"), requested=qty,
                available=0, conflict="NEW_ITEM",
                message="Not in inventory — will be created",
            ))
    return OutwardPreview(lines=results, has_conflicts=has_conflicts)


async def execute_outward(db: AsyncSession, project_id: UUID, req, user_id: UUID):
    """Create an outward movement, reconciling inventory: creates missing items,
    and (when confirmed) raises recorded stock to cover over-issues."""
    from modules.assets.models import Asset
    from modules.assets.service import (
        available_quantity,
        adjust_stock,
        quick_create_asset,
        record_asset_event,
    )

    project = await get_project(db, project_id)
    if not req.items:
        raise BadRequestException("Add at least one item to the outward form")

    # Detect conflicts first; without confirm, refuse and let the client preview.
    preview = await preview_outward(db, project_id, req.items)
    if preview.has_conflicts and not req.confirm:
        raise BadRequestException(
            "This outward form has stock conflicts — preview and confirm to proceed"
        )

    movement = EquipmentMovement(
        project_id=project.id,
        phase_id=req.phase_id,
        direction="OUTWARD",
        handled_by=req.handled_by,
        received_by_name=req.received_by_name,
        notes=req.notes,
        created_by=user_id,
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)

    labels = []
    for line in req.items:
        qty = max(1, line.quantity or 1)
        # resolve or create the asset
        if line.asset_id:
            asset = await db.get(Asset, line.asset_id)
            if not asset or asset.deleted_at is not None:
                asset = await quick_create_asset(db, line.name or "Item", qty, user_id)
        else:
            asset = await quick_create_asset(db, line.name or "Item", qty, user_id)

        # reconcile over-issue for bulk items (confirm already enforced above)
        if asset.item_kind == "BULK":
            avail = await available_quantity(db, asset)
            if qty > avail:
                shortfall = qty - avail
                await adjust_stock(
                    db, asset, (asset.quantity or 0) + shortfall, user_id,
                    note=f"Over-issue to project {project.name}",
                )

        db.add(EquipmentMovementItem(
            movement_id=movement.id,
            asset_id=asset.id,
            quantity=qty,
            condition_note=line.condition_note,
            item_status="WITH_CLIENT",
        ))
        old_status = asset.status
        asset.status = "WITH_PROJECT"
        asset.current_project_id = project.id
        await db.commit()
        await record_asset_event(
            db, asset.id, "OUTWARD", user_id,
            old_status=old_status, new_status="WITH_PROJECT",
            project_id=project.id, note=line.condition_note,
        )
        labels.append(asset.asset_code)

    await db.refresh(movement)
    await add_timeline_event(
        db, project.id, "EQUIPMENT",
        f"Equipment sent out: {', '.join(labels)}",
        created_by=user_id,
    )
    return MovementResponse.model_validate(movement)


# --- Deployments (project ↔ device/couple/pair/asset) ---

async def list_deployments(db: AsyncSession, project_id: UUID):
    from modules.projects.schemas import DeploymentResponse

    await get_project(db, project_id)
    stmt = (
        select(ProjectDeployment)
        .where(
            ProjectDeployment.project_id == project_id,
            ProjectDeployment.removed_at.is_(None),
        )
        .order_by(ProjectDeployment.deployed_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    out = []
    for dep in rows:
        label, sub = await _resolve_entity_label(db, dep.entity_type, dep.entity_id)
        resp = DeploymentResponse.model_validate(dep)
        resp.label = label
        resp.sub = sub
        out.append(resp)
    return out


async def add_deployment(db: AsyncSession, project_id: UUID, body, user_id: UUID):
    from modules.projects.schemas import DeploymentResponse

    project = await get_project(db, project_id)
    if body.entity_type not in VALID_DEPLOYMENT_TYPES:
        raise BadRequestException(
            f"entity_type must be one of {sorted(VALID_DEPLOYMENT_TYPES)}"
        )
    # de-dupe active deployment of the same entity
    existing = (
        await db.execute(
            select(ProjectDeployment).where(
                ProjectDeployment.project_id == project_id,
                ProjectDeployment.entity_type == body.entity_type,
                ProjectDeployment.entity_id == body.entity_id,
                ProjectDeployment.removed_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if existing:
        dep = existing
    else:
        dep = ProjectDeployment(
            project_id=project_id,
            entity_type=body.entity_type,
            entity_id=body.entity_id,
            note=body.note,
            created_by=user_id,
        )
        db.add(dep)
        await db.commit()
        await db.refresh(dep)

    label, sub = await _resolve_entity_label(db, dep.entity_type, dep.entity_id)
    await add_timeline_event(
        db,
        project.id,
        "EQUIPMENT",
        f"Deployed {body.entity_type}: {label or body.entity_id}",
        created_by=user_id,
    )
    resp = DeploymentResponse.model_validate(dep)
    resp.label = label
    resp.sub = sub
    return resp


async def remove_deployment(db: AsyncSession, project_id: UUID, deployment_id: UUID, user_id: UUID):
    dep = await db.get(ProjectDeployment, deployment_id)
    if not dep or dep.project_id != project_id or dep.removed_at is not None:
        raise NotFoundException("Deployment not found")
    dep.removed_at = datetime.now(timezone.utc)
    await db.commit()


async def deployments_for_entity(db: AsyncSession, entity_type: str, entity_id: UUID):
    """Reverse lookup: which project(s) is this entity currently serving?"""
    from modules.projects.schemas import DeploymentResponse

    stmt = select(ProjectDeployment).where(
        ProjectDeployment.entity_type == entity_type,
        ProjectDeployment.entity_id == entity_id,
        ProjectDeployment.removed_at.is_(None),
    )
    rows = (await db.execute(stmt)).scalars().all()
    out = []
    for dep in rows:
        project = await db.get(Project, dep.project_id)
        resp = DeploymentResponse.model_validate(dep)
        resp.label = project.name if project else None
        out.append(resp)
    return out


async def update_movement_item(
    db: AsyncSession, item_id: UUID, body: ItemReturn, user_id: UUID
) -> MovementResponse:
    item = await db.get(EquipmentMovementItem, item_id)
    if not item:
        raise NotFoundException("Movement item not found")
    if body.item_status not in VALID_ITEM_STATUSES:
        raise BadRequestException(f"item_status must be one of {sorted(VALID_ITEM_STATUSES)}")

    item.item_status = body.item_status
    if body.condition_note:
        item.condition_note = body.condition_note
    await db.commit()

    asset = await db.get(Asset, item.asset_id)
    movement = await db.get(EquipmentMovement, item.movement_id)
    if asset:
        old_status = asset.status
        if body.item_status == "RETURNED":
            asset.status = "IN_OFFICE"
            asset.current_project_id = None
        elif body.item_status == "DAMAGED":
            asset.status = "DAMAGED"
        elif body.item_status == "LOST":
            asset.status = "LOST"
        await db.commit()
        if asset.status != old_status:
            await record_asset_event(
                db,
                asset.id,
                f"ITEM_{body.item_status}",
                user_id,
                old_status=old_status,
                new_status=asset.status,
                project_id=movement.project_id if movement else None,
                note=body.condition_note,
            )

    await db.refresh(movement)
    return MovementResponse.model_validate(movement)
