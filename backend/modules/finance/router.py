import io
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_permission_map, require_permission, get_current_user
from core.permissions import LEVEL_MANAGE, level_satisfies
from modules.auth.models import User
from modules.documents.storage import MinIOStorage, get_storage
from modules.finance import service
from modules.finance.schemas import (
    AdvanceCreate,
    AdvanceResponse,
    BalanceResponse,
    BatchCreate,
    BatchResponse,
    ClaimCreate,
    ClaimResponse,
    ClaimSettle,
    ClaimUpdate,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseStatusUpdate,
    ExpenseSummary,
    ExpenseUpdate,
    ImportResult,
    MyFinanceSummary,
    SettlementSummary,
)
from shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


async def _is_manager(db: AsyncSession, user: User) -> bool:
    perm_map = await get_permission_map(db, user)
    return level_satisfies(perm_map.get("finance", "NONE"), LEVEL_MANAGE)


@router.get("/", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    project_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
    person_id: Optional[UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_expenses(
        db,
        PaginationParams(page=page, size=size),
        project_id=project_id,
        category=category,
        person_id=person_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("/", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_expense(db, body, current_user.id)


@router.get("/summary", response_model=ExpenseSummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_summary(db)


# --- My finance (every user) ---

@router.get("/my", response_model=MyFinanceSummary)
async def my_finance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.my_finance(db, current_user.id)


# --- Settlement (finance person) ---

@router.get("/settlement", response_model=SettlementSummary)
async def settlement(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.settlement_summary(db)


# --- Advances ---

@router.get("/advances", response_model=list[AdvanceResponse])
async def list_advances(
    person_id: Optional[UUID] = Query(None),
    project_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_advances(db, person_id=person_id, project_id=project_id)


@router.post("/advances", response_model=AdvanceResponse, status_code=201)
async def create_advance(
    body: AdvanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_advance(db, body, current_user.id)


@router.delete("/advances/{advance_id}")
async def delete_advance(
    advance_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_advance(db, advance_id, current_user.id)
    return {"detail": "Advance deleted"}


@router.get("/balance/{person_id}", response_model=BalanceResponse)
async def get_balance(
    person_id: UUID,
    project_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.get_balance(db, person_id, project_id)


# --- Claims ---

@router.get("/claims", response_model=list[ClaimResponse])
async def list_claims(
    status: Optional[str] = Query(None),
    project_id: Optional[UUID] = Query(None),
    mine: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_claims(
        db,
        status=status,
        project_id=project_id,
        submitted_by=current_user.id if mine else None,
    )


@router.post("/claims", response_model=ClaimResponse, status_code=201)
async def create_claim(
    body: ClaimCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_claim(db, body, current_user.id)


@router.put("/claims/{claim_id}", response_model=ClaimResponse)
async def update_claim(
    claim_id: UUID,
    body: ClaimUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_claim(db, claim_id, body, current_user.id)


@router.post("/claims/{claim_id}/submit", response_model=ClaimResponse)
async def submit_claim(
    claim_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.submit_claim(db, claim_id, current_user.id)


@router.post("/claims/{claim_id}/settle", response_model=ClaimResponse)
async def settle_claim(
    claim_id: UUID,
    body: ClaimSettle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.settle_claim(db, claim_id, body, current_user.id)


@router.get("/batches", response_model=list[BatchResponse])
async def list_batches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.list_batches(db)


@router.post("/batches", response_model=BatchResponse, status_code=201)
async def create_batch(
    body: BatchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.create_batch(db, body, current_user.id)


@router.post("/import", response_model=ImportResult)
async def import_sheet(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.import_sheet(db, file, current_user.id)


@router.get("/export")
async def export_expenses(
    format: str = Query("pdf", pattern="^(pdf|xlsx|zip)$"),
    scope: str = Query("all", pattern="^(all|project|user|claim)$"),
    scope_id: Optional[UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    include_images: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: MinIOStorage = Depends(get_storage),
):
    """Multi-format bill export: itemised PDF (optionally with receipt images
    appended), Excel, or a ZIP of the raw receipts plus a summary CSV."""
    payload, media_type, filename = await service.export_expenses(
        db,
        storage,
        fmt=format,
        scope=scope,
        scope_id=scope_id,
        date_from=date_from,
        date_to=date_to,
        include_images=include_images,
    )
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/bill.pdf")
async def generate_bill(
    project_id: Optional[UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = await service.generate_bill_pdf(db, project_id, date_from, date_to)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="expense-report.pdf"'},
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await service.get_expense(db, expense_id)
    return ExpenseResponse.model_validate(expense)


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    body: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await service.update_expense(
        db, expense_id, body, current_user.id, await _is_manager(db, current_user)
    )


@router.put("/{expense_id}/status", response_model=ExpenseResponse)
async def set_expense_status(
    expense_id: UUID,
    body: ExpenseStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Finance person flags an individual expense paid / rejected / pending."""
    return await service.set_expense_status(db, expense_id, body.status, current_user.id)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await service.delete_expense(
        db, expense_id, current_user.id, await _is_manager(db, current_user)
    )
    return {"detail": "Expense deleted"}
