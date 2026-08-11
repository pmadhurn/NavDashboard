from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user
from modules.auth.models import User
from modules.projects import service
from modules.projects.schemas import (
    DeploymentCreate,
    DeploymentResponse,
    ItemReturn,
    MemberAdd,
    MemberMove,
    MemberResponse,
    MovementCreate,
    MovementResponse,
    OutwardPreview,
    OutwardRequest,
    PhaseCreate,
    PhaseResponse,
    PhaseUpdate,
    ProjectCloseRequest,
    ProjectCreate,
    ProjectResponse,
    ProjectSummary,
    ProjectUpdate,
    TimelineEntryCreate,
    TimelineEntryResponse,
)
from shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    project_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_projects(
        db,
        PaginationParams(page=page, size=size),
        search=search,
        project_type=project_type,
        status=status,
    )


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_project(db, body, current_user.id)


@router.get("/{project_id}/archive")
async def project_archive(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """What exists on this project, counted — so nothing is invisible."""
    return await service.project_archive(db, project_id)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await service.get_project(db, project_id)
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_project(db, project_id, body, current_user.id)


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_project(db, project_id, current_user.id)
    return {"detail": "Project deleted"}


@router.get("/{project_id}/summary", response_model=ProjectSummary)
async def get_summary(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_summary(db, project_id)


# --- Members ---

@router.post("/{project_id}/members", response_model=MemberResponse, status_code=201)
async def add_member(
    project_id: UUID,
    body: MemberAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.add_member(db, project_id, body, current_user.id)


@router.delete("/{project_id}/members/{member_id}")
async def remove_member(
    project_id: UUID,
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.remove_member(db, project_id, member_id, current_user.id)
    return {"detail": "Member removed"}


# --- Timeline ---

@router.get("/{project_id}/timeline", response_model=PaginatedResponse[TimelineEntryResponse])
async def list_timeline(
    project_id: UUID,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    entry_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_timeline(
        db, project_id, PaginationParams(page=page, size=size), entry_type
    )


@router.post("/{project_id}/timeline", response_model=TimelineEntryResponse, status_code=201)
async def create_timeline_entry(
    project_id: UUID,
    body: TimelineEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_timeline_entry(db, project_id, body, current_user.id)


# --- Outward form + conflict engine ---

@router.post("/{project_id}/outward/preview", response_model=OutwardPreview)
async def outward_preview(
    project_id: UUID,
    body: OutwardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.preview_outward(db, project_id, body.items)


@router.post("/{project_id}/outward", response_model=MovementResponse, status_code=201)
async def outward_execute(
    project_id: UUID,
    body: OutwardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.execute_outward(db, project_id, body, current_user.id)


# --- Phases ---

@router.get("/{project_id}/phases", response_model=list[PhaseResponse])
async def list_phases(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_phases(db, project_id)


@router.post("/{project_id}/phases", response_model=PhaseResponse, status_code=201)
async def create_phase(
    project_id: UUID,
    body: PhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_phase(db, project_id, body, current_user.id)


@router.put("/phases/{phase_id}", response_model=PhaseResponse)
async def update_phase(
    phase_id: UUID,
    body: PhaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_phase(db, phase_id, body, current_user.id)


# --- Member move + project close ---

@router.post("/{project_id}/members/{member_id}/move", response_model=MemberResponse)
async def move_member(
    project_id: UUID,
    member_id: UUID,
    body: MemberMove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.move_member(db, project_id, member_id, body, current_user.id)


@router.post("/{project_id}/close", response_model=ProjectResponse)
async def close_project(
    project_id: UUID,
    body: ProjectCloseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.close_project(db, project_id, body, current_user.id)


# --- Equipment ---

@router.get("/{project_id}/movements", response_model=list[MovementResponse])
async def list_movements(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_movements(db, project_id)


@router.post("/{project_id}/movements", response_model=MovementResponse, status_code=201)
async def create_movement(
    project_id: UUID,
    body: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_movement(db, project_id, body, current_user.id)


@router.put("/movements/items/{item_id}", response_model=MovementResponse)
async def update_movement_item(
    item_id: UUID,
    body: ItemReturn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_movement_item(db, item_id, body, current_user.id)


# --- Deployments (project ↔ device/couple/pair/asset) ---

@router.get("/{project_id}/deployments", response_model=list[DeploymentResponse])
async def list_deployments(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_deployments(db, project_id)


@router.post("/{project_id}/deployments", response_model=DeploymentResponse, status_code=201)
async def add_deployment(
    project_id: UUID,
    body: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.add_deployment(db, project_id, body, current_user.id)


@router.delete("/{project_id}/deployments/{deployment_id}")
async def remove_deployment(
    project_id: UUID,
    deployment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.remove_deployment(db, project_id, deployment_id, current_user.id)
    return {"detail": "Deployment removed"}


@router.get("/deployments/for/{entity_type}/{entity_id}", response_model=list[DeploymentResponse])
async def deployments_for_entity(
    entity_type: str,
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.deployments_for_entity(db, entity_type, entity_id)
