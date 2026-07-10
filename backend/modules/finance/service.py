from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from modules.finance.models import (
    Expense,
    ExpenseBatch,
    ExpenseClaim,
    ExpenseMember,
    FundAllocation,
)
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
    ExpenseSummary,
    ExpenseUpdate,
    ImportResult,
    MyFinanceSummary,
    SettlementPerson,
    SettlementProject,
    SettlementSummary,
)
from modules.projects.models import Project
from shared.audit import record_audit
from shared.pagination import PaginatedResponse, PaginationParams, paginate

logger = logging.getLogger(__name__)


async def _set_members(db: AsyncSession, expense: Expense, person_ids: list[UUID]) -> None:
    stmt = select(ExpenseMember).where(ExpenseMember.expense_id == expense.id)
    existing = {m.person_id: m for m in (await db.execute(stmt)).scalars().all()}
    wanted = set(person_ids)
    for person_id in wanted - existing.keys():
        db.add(ExpenseMember(expense_id=expense.id, person_id=person_id))
    for person_id in existing.keys() - wanted:
        await db.delete(existing[person_id])
    await db.commit()


async def list_expenses(
    db: AsyncSession,
    params: PaginationParams,
    project_id: Optional[UUID] = None,
    category: Optional[str] = None,
    person_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> PaginatedResponse[ExpenseResponse]:
    stmt = select(Expense).where(Expense.deleted_at.is_(None))
    if project_id:
        stmt = stmt.where(Expense.project_id == project_id)
    if category:
        stmt = stmt.where(Expense.category == category)
    if person_id:
        member_sub = (
            select(ExpenseMember.expense_id)
            .where(ExpenseMember.person_id == person_id)
            .scalar_subquery()
        )
        stmt = stmt.where(Expense.id.in_(member_sub))
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    stmt = stmt.order_by(Expense.expense_date.desc())
    return await paginate(db, stmt, params, ExpenseResponse)


async def get_expense(db: AsyncSession, expense_id: UUID) -> Expense:
    stmt = select(Expense).where(Expense.id == expense_id, Expense.deleted_at.is_(None))
    expense = (await db.execute(stmt)).scalar_one_or_none()
    if not expense:
        raise NotFoundException("Expense not found")
    return expense


async def create_expense(db: AsyncSession, body: ExpenseCreate, user_id: UUID) -> ExpenseResponse:
    expense = Expense(
        title=body.title,
        amount=body.amount,
        currency=body.currency,
        category=body.category,
        project_id=body.project_id,
        batch_id=body.batch_id,
        claim_id=body.claim_id,
        notes=body.notes,
        added_by=user_id,
    )
    if body.expense_date:
        expense.expense_date = body.expense_date
    db.add(expense)
    await db.commit()
    await db.refresh(expense)

    if body.member_person_ids:
        await _set_members(db, expense, body.member_person_ids)
        await db.refresh(expense)

    if body.project_id:
        from modules.projects.service import add_timeline_event

        await add_timeline_event(
            db,
            body.project_id,
            "EXPENSE",
            f"Expense added: {body.title} ({body.currency} {body.amount:,.2f})",
            created_by=user_id,
        )

    await record_audit(
        db,
        action="CREATE",
        entity_type="expense",
        entity_id=expense.id,
        user_id=user_id,
        new_values={"title": body.title, "amount": str(body.amount)},
    )
    return ExpenseResponse.model_validate(expense)


async def update_expense(
    db: AsyncSession, expense_id: UUID, body: ExpenseUpdate, user_id: UUID, is_manager: bool
) -> ExpenseResponse:
    expense = await get_expense(db, expense_id)
    if not is_manager and expense.added_by != user_id:
        raise ForbiddenException("Only the person who added this expense can edit it")

    update_data = body.model_dump(exclude_unset=True, exclude={"member_person_ids"})
    for field, value in update_data.items():
        setattr(expense, field, value)
    expense.updated_at = datetime.now(timezone.utc)
    await db.commit()

    if body.member_person_ids is not None:
        await _set_members(db, expense, body.member_person_ids)
    await db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


async def delete_expense(
    db: AsyncSession, expense_id: UUID, user_id: UUID, is_manager: bool
) -> None:
    expense = await get_expense(db, expense_id)
    if not is_manager and expense.added_by != user_id:
        raise ForbiddenException("Only the person who added this expense can delete it")
    expense.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_summary(db: AsyncSession) -> ExpenseSummary:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    base = select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.deleted_at.is_(None))
    total_all = float((await db.execute(base)).scalar_one())
    total_month = float(
        (await db.execute(base.where(Expense.expense_date >= month_start))).scalar_one()
    )
    count = (
        await db.execute(
            select(func.count()).select_from(Expense).where(Expense.deleted_at.is_(None))
        )
    ).scalar_one()

    by_project_stmt = (
        select(Project.name, func.sum(Expense.amount))
        .join(Project, Expense.project_id == Project.id)
        .where(Expense.deleted_at.is_(None))
        .group_by(Project.name)
        .order_by(func.sum(Expense.amount).desc())
        .limit(10)
    )
    by_project = [
        {"name": row[0], "total": float(row[1])}
        for row in (await db.execute(by_project_stmt)).all()
    ]

    by_category_stmt = (
        select(Expense.category, func.sum(Expense.amount))
        .where(Expense.deleted_at.is_(None), Expense.category.isnot(None))
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
        .limit(10)
    )
    by_category = [
        {"name": row[0], "total": float(row[1])}
        for row in (await db.execute(by_category_stmt)).all()
    ]

    return ExpenseSummary(
        total_this_month=total_month,
        total_all_time=total_all,
        count=count,
        by_project=by_project,
        by_category=by_category,
    )


# --- Advances (funds received from office) ---

async def _user_id_for_person(db: AsyncSession, person_id: UUID):
    from modules.personnel.models import Person

    person = await db.get(Person, person_id)
    return person.user_id if person else None


async def _person_id_for_user(db: AsyncSession, user_id: UUID):
    from modules.personnel.models import Person

    stmt = select(Person).where(Person.user_id == user_id, Person.deleted_at.is_(None))
    person = (await db.execute(stmt)).scalar_one_or_none()
    return person.id if person else None


async def list_advances(
    db: AsyncSession, person_id: Optional[UUID] = None, project_id: Optional[UUID] = None
) -> list[AdvanceResponse]:
    stmt = select(FundAllocation).where(FundAllocation.deleted_at.is_(None))
    if person_id:
        stmt = stmt.where(FundAllocation.person_id == person_id)
    if project_id:
        stmt = stmt.where(FundAllocation.project_id == project_id)
    stmt = stmt.order_by(FundAllocation.received_date.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [AdvanceResponse.model_validate(r) for r in rows]


async def create_advance(db: AsyncSession, body: AdvanceCreate, user_id: UUID) -> AdvanceResponse:
    advance = FundAllocation(
        person_id=body.person_id,
        project_id=body.project_id,
        amount=body.amount,
        currency=body.currency,
        source_note=body.source_note,
        logged_by=user_id,
    )
    if body.received_date:
        advance.received_date = body.received_date
    db.add(advance)
    await db.commit()
    await db.refresh(advance)
    await record_audit(
        db,
        action="CREATE",
        entity_type="fund_allocation",
        entity_id=advance.id,
        user_id=user_id,
        new_values={"person_id": str(body.person_id), "amount": str(body.amount)},
    )
    return AdvanceResponse.model_validate(advance)


async def delete_advance(db: AsyncSession, advance_id: UUID, user_id: UUID) -> None:
    advance = await db.get(FundAllocation, advance_id)
    if not advance or advance.deleted_at is not None:
        raise NotFoundException("Advance not found")
    advance.deleted_at = datetime.now(timezone.utc)
    await db.commit()


async def get_balance(
    db: AsyncSession, person_id: UUID, project_id: Optional[UUID] = None
) -> BalanceResponse:
    """Balance = advances received − expenses logged by that person."""
    adv_stmt = select(func.coalesce(func.sum(FundAllocation.amount), 0)).where(
        FundAllocation.deleted_at.is_(None), FundAllocation.person_id == person_id
    )
    if project_id:
        adv_stmt = adv_stmt.where(FundAllocation.project_id == project_id)
    advances = float((await db.execute(adv_stmt)).scalar_one())

    spent = 0.0
    linked_user = await _user_id_for_person(db, person_id)
    if linked_user:
        exp_stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.deleted_at.is_(None), Expense.added_by == linked_user
        )
        if project_id:
            exp_stmt = exp_stmt.where(Expense.project_id == project_id)
        spent = float((await db.execute(exp_stmt)).scalar_one())

    return BalanceResponse(
        person_id=person_id,
        project_id=project_id,
        advances=advances,
        spent=spent,
        balance=advances - spent,
    )


# --- Claims ---

async def _claim_totals(db: AsyncSession, claim_id: UUID) -> tuple[float, int]:
    stmt = select(
        func.coalesce(func.sum(Expense.amount), 0), func.count()
    ).where(Expense.deleted_at.is_(None), Expense.claim_id == claim_id)
    total, count = (await db.execute(stmt)).one()
    return float(total or 0), int(count or 0)


async def _claim_response(db: AsyncSession, claim: ExpenseClaim) -> ClaimResponse:
    total, count = await _claim_totals(db, claim.id)
    resp = ClaimResponse.model_validate(claim)
    resp.total = total
    resp.expense_count = count
    return resp


async def list_claims(
    db: AsyncSession,
    status: Optional[str] = None,
    project_id: Optional[UUID] = None,
    submitted_by: Optional[UUID] = None,
) -> list[ClaimResponse]:
    stmt = select(ExpenseClaim).where(ExpenseClaim.deleted_at.is_(None))
    if status:
        stmt = stmt.where(ExpenseClaim.status == status)
    if project_id:
        stmt = stmt.where(ExpenseClaim.project_id == project_id)
    if submitted_by:
        stmt = stmt.where(ExpenseClaim.submitted_by == submitted_by)
    stmt = stmt.order_by(ExpenseClaim.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [await _claim_response(db, c) for c in rows]


async def get_claim(db: AsyncSession, claim_id: UUID) -> ExpenseClaim:
    claim = await db.get(ExpenseClaim, claim_id)
    if not claim or claim.deleted_at is not None:
        raise NotFoundException("Claim not found")
    return claim


async def create_claim(db: AsyncSession, body: ClaimCreate, user_id: UUID) -> ClaimResponse:
    claim = ExpenseClaim(
        title=body.title,
        project_id=body.project_id,
        note=body.note,
        submitted_by=user_id,
        status="DRAFT",
    )
    db.add(claim)
    await db.commit()
    await db.refresh(claim)

    if body.expense_ids:
        await _attach_expenses(db, claim.id, body.expense_ids)

    await record_audit(
        db,
        action="CREATE",
        entity_type="expense_claim",
        entity_id=claim.id,
        user_id=user_id,
        new_values={"title": claim.title},
    )
    return await _claim_response(db, claim)


async def _attach_expenses(db: AsyncSession, claim_id: UUID, expense_ids: list[UUID]) -> None:
    for eid in expense_ids:
        expense = await db.get(Expense, eid)
        if expense and expense.deleted_at is None:
            expense.claim_id = claim_id
    await db.commit()


async def update_claim(
    db: AsyncSession, claim_id: UUID, body: ClaimUpdate, user_id: UUID
) -> ClaimResponse:
    claim = await get_claim(db, claim_id)
    if claim.status in {"PAID"}:
        raise ConflictException("A paid claim can't be edited")
    if body.title is not None:
        claim.title = body.title
    if body.note is not None:
        claim.note = body.note
    await db.commit()

    if body.add_expense_ids:
        await _attach_expenses(db, claim.id, body.add_expense_ids)
    for eid in body.remove_expense_ids:
        expense = await db.get(Expense, eid)
        if expense and expense.claim_id == claim.id:
            expense.claim_id = None
    await db.commit()
    await db.refresh(claim)
    return await _claim_response(db, claim)


async def submit_claim(db: AsyncSession, claim_id: UUID, user_id: UUID) -> ClaimResponse:
    claim = await get_claim(db, claim_id)
    if claim.status not in {"DRAFT", "REJECTED"}:
        raise ConflictException(f"Claim is already {claim.status}")
    claim.status = "SUBMITTED"
    claim.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(claim)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="expense_claim",
        entity_id=claim.id,
        user_id=user_id,
        new_values={"status": "SUBMITTED"},
    )
    return await _claim_response(db, claim)


async def settle_claim(
    db: AsyncSession, claim_id: UUID, body: ClaimSettle, user_id: UUID
) -> ClaimResponse:
    """Finance marks a whole claim paid/rejected; cascades to its expenses."""
    from modules.finance.schemas import CLAIM_STATUSES

    claim = await get_claim(db, claim_id)
    if body.status not in CLAIM_STATUSES:
        raise BadRequestException(f"status must be one of {CLAIM_STATUSES}")

    claim.status = body.status
    claim.settled_by = user_id
    claim.settled_at = datetime.now(timezone.utc)
    await db.commit()

    if body.status in {"PAID", "REJECTED"}:
        expense_status = "PAID" if body.status == "PAID" else "REJECTED"
        stmt = select(Expense).where(
            Expense.deleted_at.is_(None), Expense.claim_id == claim.id
        )
        for expense in (await db.execute(stmt)).scalars().all():
            expense.status = expense_status
            if expense_status == "PAID":
                expense.paid_by = user_id
                expense.paid_at = datetime.now(timezone.utc)
        await db.commit()

    await db.refresh(claim)
    await record_audit(
        db,
        action="UPDATE",
        entity_type="expense_claim",
        entity_id=claim.id,
        user_id=user_id,
        new_values={"status": body.status},
    )
    return await _claim_response(db, claim)


async def set_expense_status(
    db: AsyncSession, expense_id: UUID, status: str, user_id: UUID
) -> ExpenseResponse:
    from modules.finance.schemas import EXPENSE_STATUSES

    if status not in EXPENSE_STATUSES:
        raise BadRequestException(f"status must be one of {EXPENSE_STATUSES}")
    expense = await get_expense(db, expense_id)
    expense.status = status
    if status == "PAID":
        expense.paid_by = user_id
        expense.paid_at = datetime.now(timezone.utc)
    else:
        expense.paid_by = None
        expense.paid_at = None
    await db.commit()
    await db.refresh(expense)
    return ExpenseResponse.model_validate(expense)


# --- Dashboards ---

async def my_finance(db: AsyncSession, user_id: UUID) -> MyFinanceSummary:
    person_id = await _person_id_for_user(db, user_id)

    advances = 0.0
    if person_id:
        adv = await get_balance(db, person_id)
        advances = adv.advances

    base = select(func.coalesce(func.sum(Expense.amount), 0)).where(
        Expense.deleted_at.is_(None), Expense.added_by == user_id
    )
    spent = float((await db.execute(base)).scalar_one())
    pending = float(
        (await db.execute(base.where(Expense.status.in_(["SUBMITTED", "DRAFT"])))).scalar_one()
    )
    paid = float((await db.execute(base.where(Expense.status == "PAID"))).scalar_one())
    count = int(
        (
            await db.execute(
                select(func.count()).select_from(Expense).where(
                    Expense.deleted_at.is_(None), Expense.added_by == user_id
                )
            )
        ).scalar_one()
    )
    claims = int(
        (
            await db.execute(
                select(func.count()).select_from(ExpenseClaim).where(
                    ExpenseClaim.deleted_at.is_(None), ExpenseClaim.submitted_by == user_id
                )
            )
        ).scalar_one()
    )

    return MyFinanceSummary(
        person_id=person_id,
        advances=advances,
        spent=spent,
        balance=advances - spent,
        pending_total=pending,
        paid_total=paid,
        expense_count=count,
        claim_count=claims,
    )


async def settlement_summary(db: AsyncSession) -> SettlementSummary:
    """Finance-person view: pending vs paid across everyone and every project."""
    from modules.auth.models import User
    from modules.personnel.models import Person
    from modules.projects.models import Project

    pending_total = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    Expense.deleted_at.is_(None),
                    Expense.status.in_(["SUBMITTED", "DRAFT"]),
                )
            )
        ).scalar_one()
    )
    paid_total = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(Expense.amount), 0)).where(
                    Expense.deleted_at.is_(None), Expense.status == "PAID"
                )
            )
        ).scalar_one()
    )

    # Per-user rollup (aggregate SQL, no per-row loops)
    per_user_stmt = (
        select(
            Expense.added_by,
            func.coalesce(func.sum(Expense.amount), 0),
            func.coalesce(
                func.sum(
                    case((Expense.status.in_(["SUBMITTED", "DRAFT"]), Expense.amount), else_=0)
                ),
                0,
            ),
            func.coalesce(
                func.sum(case((Expense.status == "PAID", Expense.amount), else_=0)), 0
            ),
        )
        .where(Expense.deleted_at.is_(None))
        .group_by(Expense.added_by)
    )
    by_person: list[SettlementPerson] = []
    for added_by, spent, pending, paid in (await db.execute(per_user_stmt)).all():
        user = await db.get(User, added_by)
        person = (
            await db.execute(
                select(Person).where(Person.user_id == added_by, Person.deleted_at.is_(None))
            )
        ).scalar_one_or_none()
        advances = 0.0
        if person:
            adv_row = await get_balance(db, person.id)
            advances = adv_row.advances
        by_person.append(
            SettlementPerson(
                person_id=person.id if person else None,
                user_id=added_by,
                name=(person.full_name if person else (user.full_name if user else "Unknown")),
                advances=advances,
                spent=float(spent),
                balance=advances - float(spent),
                pending=float(pending),
                paid=float(paid),
            )
        )

    # Per-project rollup
    per_project_stmt = (
        select(
            Expense.project_id,
            func.coalesce(func.sum(Expense.amount), 0),
            func.coalesce(
                func.sum(
                    case((Expense.status.in_(["SUBMITTED", "DRAFT"]), Expense.amount), else_=0)
                ),
                0,
            ),
            func.coalesce(
                func.sum(case((Expense.status == "PAID", Expense.amount), else_=0)), 0
            ),
        )
        .where(Expense.deleted_at.is_(None))
        .group_by(Expense.project_id)
    )
    by_project: list[SettlementProject] = []
    for project_id, total, pending, paid in (await db.execute(per_project_stmt)).all():
        project = await db.get(Project, project_id) if project_id else None
        by_project.append(
            SettlementProject(
                project_id=project_id,
                name=project.name if project else "Unassigned",
                total=float(total),
                pending=float(pending),
                paid=float(paid),
            )
        )

    by_person.sort(key=lambda p: p.pending, reverse=True)
    by_project.sort(key=lambda p: p.pending, reverse=True)
    return SettlementSummary(
        total_pending=pending_total,
        total_paid=paid_total,
        by_person=by_person,
        by_project=by_project,
    )


# --- Batches ---

async def list_batches(db: AsyncSession) -> list[BatchResponse]:
    stmt = (
        select(ExpenseBatch)
        .where(ExpenseBatch.deleted_at.is_(None))
        .order_by(ExpenseBatch.created_at.desc())
    )
    result = await db.execute(stmt)
    return [BatchResponse.model_validate(b) for b in result.scalars().all()]


async def create_batch(db: AsyncSession, body: BatchCreate, user_id: UUID) -> BatchResponse:
    batch = ExpenseBatch(title=body.title, notes=body.notes, created_by=user_id)
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return BatchResponse.model_validate(batch)


# --- Sheet import ---

async def import_sheet(db: AsyncSession, file: UploadFile, user_id: UUID) -> ImportResult:
    """Import expenses from xlsx/csv. Expected columns: title, amount, date?, category?, notes?"""
    filename = (file.filename or "").lower()
    raw = await file.read()
    rows: list[dict] = []

    if filename.endswith(".csv"):
        import csv

        text = raw.decode("utf-8-sig", errors="replace")
        for row in csv.DictReader(io.StringIO(text)):
            rows.append({(k or "").strip().lower(): (v or "").strip() for k, v in row.items()})
    elif filename.endswith((".xlsx", ".xlsm")):
        from openpyxl import load_workbook

        workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        sheet = workbook.active
        header: list[str] = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                header = [str(c or "").strip().lower() for c in row]
                continue
            rows.append({header[j]: row[j] for j in range(min(len(header), len(row)))})
    else:
        raise BadRequestException("Upload a .csv or .xlsx file")

    created, skipped, errors = 0, 0, []
    for i, row in enumerate(rows, start=2):
        title = str(row.get("title") or row.get("description") or "").strip()
        raw_amount = row.get("amount")
        try:
            amount = float(str(raw_amount).replace(",", "")) if raw_amount not in (None, "") else 0
        except ValueError:
            amount = 0
        if not title or amount <= 0:
            skipped += 1
            if len(errors) < 10:
                errors.append(f"Row {i}: missing title or valid amount")
            continue

        expense = Expense(
            title=title[:300],
            amount=amount,
            category=(str(row.get("category")).strip()[:100] or None) if row.get("category") else None,
            notes=(str(row.get("notes")).strip() or None) if row.get("notes") else None,
            added_by=user_id,
        )
        raw_date = row.get("date") or row.get("expense_date")
        if raw_date:
            if isinstance(raw_date, datetime):
                expense.expense_date = raw_date.replace(tzinfo=raw_date.tzinfo or timezone.utc)
            else:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"):
                    try:
                        expense.expense_date = datetime.strptime(str(raw_date).strip(), fmt).replace(
                            tzinfo=timezone.utc
                        )
                        break
                    except ValueError:
                        continue
        db.add(expense)
        created += 1

    await db.commit()
    return ImportResult(created=created, skipped=skipped, errors=errors)


# --- Multi-format export engine ---

async def _expenses_for_scope(
    db: AsyncSession,
    scope: str,
    scope_id: Optional[UUID],
    date_from: Optional[datetime],
    date_to: Optional[datetime],
) -> list[Expense]:
    stmt = select(Expense).where(Expense.deleted_at.is_(None))
    if scope == "project" and scope_id:
        stmt = stmt.where(Expense.project_id == scope_id)
    elif scope == "user" and scope_id:
        stmt = stmt.where(Expense.added_by == scope_id)
    elif scope == "claim" and scope_id:
        stmt = stmt.where(Expense.claim_id == scope_id)
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    stmt = stmt.order_by(Expense.expense_date)
    return list((await db.execute(stmt)).scalars().all())


async def _receipts_for(db: AsyncSession, expenses: list[Expense]) -> dict:
    """expense_id -> [Document] for attached receipts."""
    from modules.documents.models import Document

    if not expenses:
        return {}
    ids = [e.id for e in expenses]
    stmt = select(Document).where(
        Document.deleted_at.is_(None),
        Document.entity_type == "expense",
        Document.entity_id.in_(ids),
    )
    out: dict = {}
    for doc in (await db.execute(stmt)).scalars().all():
        out.setdefault(doc.entity_id, []).append(doc)
    return out


async def _fetch_bytes(storage, path: str) -> Optional[bytes]:
    """MinIO's client is synchronous — do the whole fetch inside the threadpool
    so a large export never blocks the event loop."""
    from starlette.concurrency import run_in_threadpool

    def _read() -> bytes:
        response = storage.client.get_object(storage.bucket, path)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    try:
        return await run_in_threadpool(_read)
    except Exception:
        logger.warning("Could not fetch receipt %s", path)
        return None


def _normalize_image(raw: bytes):
    """Decode a receipt image and flatten it to RGB PNG.

    reportlab reads image file-objects lazily at build time and blows up on
    alpha/palette modes, so we normalise up-front. Returns (BytesIO, (w, h))
    or (None, None) if the bytes aren't a usable image."""
    from PIL import Image as PILImage

    try:
        im = PILImage.open(io.BytesIO(raw))
        im.load()
        if im.mode in ("RGBA", "LA", "P"):
            rgba = im.convert("RGBA")
            flat = PILImage.new("RGB", rgba.size, (255, 255, 255))
            flat.paste(rgba, mask=rgba.split()[-1])
            im = flat
        elif im.mode != "RGB":
            im = im.convert("RGB")
        out = io.BytesIO()
        im.save(out, format="PNG")
        out.seek(0)
        return out, im.size
    except Exception:
        return None, None


def _scope_label(scope: str, scope_name: Optional[str]) -> str:
    if scope == "all":
        return "All expenses"
    return f"{scope.title()}: {scope_name or '—'}"


async def export_expenses(
    db: AsyncSession,
    storage,
    fmt: str,
    scope: str = "all",
    scope_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    include_images: bool = False,
) -> tuple[bytes, str, str]:
    """Return (payload, media_type, filename). Formats: pdf | xlsx | zip."""
    if fmt not in {"pdf", "xlsx", "zip"}:
        raise BadRequestException("format must be one of: pdf, xlsx, zip")

    expenses = await _expenses_for_scope(db, scope, scope_id, date_from, date_to)

    # Resolve a friendly scope name
    scope_name = None
    if scope == "project" and scope_id:
        from modules.projects.models import Project

        project = await db.get(Project, scope_id)
        scope_name = project.name if project else None
    elif scope == "claim" and scope_id:
        claim = await db.get(ExpenseClaim, scope_id)
        scope_name = claim.title if claim else None
    elif scope == "user" and scope_id:
        from modules.auth.models import User

        user = await db.get(User, scope_id)
        scope_name = user.full_name if user else None

    receipts = await _receipts_for(db, expenses) if (include_images or fmt == "zip") else {}

    if fmt == "xlsx":
        return (
            _build_xlsx(expenses, _scope_label(scope, scope_name)),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "expenses.xlsx",
        )

    if fmt == "zip":
        return (
            await _build_zip(storage, expenses, receipts),
            "application/zip",
            "expenses-with-receipts.zip",
        )

    return (
        await _build_pdf(storage, expenses, receipts, _scope_label(scope, scope_name), include_images),
        "application/pdf",
        "expense-report.pdf",
    )


def _build_xlsx(expenses: list[Expense], scope_label: str) -> bytes:
    import xlsxwriter

    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    sheet = workbook.add_worksheet("Expenses")
    bold = workbook.add_format({"bold": True})
    money = workbook.add_format({"num_format": "#,##0.00"})

    sheet.write(0, 0, scope_label, bold)
    headers = ["Date", "Title", "Category", "Status", "Amount", "Currency", "Notes"]
    for col, h in enumerate(headers):
        sheet.write(2, col, h, bold)

    total = 0.0
    for row, e in enumerate(expenses, start=3):
        total += float(e.amount)
        sheet.write(row, 0, e.expense_date.strftime("%Y-%m-%d"))
        sheet.write(row, 1, e.title)
        sheet.write(row, 2, e.category or "")
        sheet.write(row, 3, e.status)
        sheet.write_number(row, 4, float(e.amount), money)
        sheet.write(row, 5, e.currency)
        sheet.write(row, 6, e.notes or "")

    last = len(expenses) + 3
    sheet.write(last, 3, "Total", bold)
    sheet.write_number(last, 4, total, money)
    sheet.set_column(0, 0, 12)
    sheet.set_column(1, 1, 40)
    sheet.set_column(6, 6, 30)
    workbook.close()
    return buffer.getvalue()


async def _build_zip(storage, expenses: list[Expense], receipts: dict) -> bytes:
    import csv
    import zipfile

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # summary csv
        summary = io.StringIO()
        writer = csv.writer(summary)
        writer.writerow(["Date", "Title", "Category", "Status", "Amount", "Currency"])
        for e in expenses:
            writer.writerow([
                e.expense_date.strftime("%Y-%m-%d"), e.title, e.category or "",
                e.status, float(e.amount), e.currency,
            ])
        zf.writestr("summary.csv", summary.getvalue())

        for e in expenses:
            for doc in receipts.get(e.id, []):
                data = await _fetch_bytes(storage, doc.storage_path)
                if data:
                    safe = "".join(c for c in e.title if c.isalnum() or c in " -_")[:40]
                    zf.writestr(f"receipts/{safe or e.id}/{doc.original_filename}", data)
    return buffer.getvalue()


async def _build_pdf(
    storage, expenses: list[Expense], receipts: dict, scope_label: str, include_images: bool
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Image as RLImage,
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Expense Report", styles["Title"]),
        Paragraph(scope_label, styles["Normal"]),
        Spacer(1, 8 * mm),
    ]

    data = [["Date", "Title", "Category", "Status", "Amount"]]
    total = 0.0
    for e in expenses:
        total += float(e.amount)
        data.append([
            e.expense_date.strftime("%d %b %Y"),
            e.title[:50],
            e.category or "—",
            e.status,
            f"{e.currency} {float(e.amount):,.2f}",
        ])
    data.append(["", "", "", "Total", f"{expenses[0].currency if expenses else 'INR'} {total:,.2f}"])

    table = Table(data, colWidths=[26 * mm, 62 * mm, 28 * mm, 24 * mm, 34 * mm])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
        ])
    )
    elements.append(table)

    if include_images:
        for e in expenses:
            docs = receipts.get(e.id, [])
            if not docs:
                continue
            elements.append(PageBreak())
            elements.append(Paragraph(f"Receipts — {e.title}", styles["Heading3"]))
            from starlette.concurrency import run_in_threadpool

            for d in docs:
                if not (d.mime_type or "").startswith("image/"):
                    elements.append(Paragraph(f"(attachment: {d.original_filename})", styles["Normal"]))
                    continue
                raw = await _fetch_bytes(storage, d.storage_path)
                if not raw:
                    continue
                buf, size = await run_in_threadpool(_normalize_image, raw)
                if not buf or not size:
                    elements.append(
                        Paragraph(f"(unreadable image: {d.original_filename})", styles["Normal"])
                    )
                    continue
                try:
                    width_px, height_px = size
                    draw_w = min(150 * mm, width_px)
                    draw_h = draw_w * (height_px / float(width_px or 1))
                    elements.append(RLImage(buf, width=draw_w, height=draw_h))
                    elements.append(Spacer(1, 4 * mm))
                except Exception:
                    logger.warning("Could not embed receipt %s", d.original_filename)

    doc.build(elements)
    return buffer.getvalue()


# --- PDF bill ---

async def generate_bill_pdf(
    db: AsyncSession,
    project_id: Optional[UUID],
    date_from: Optional[datetime],
    date_to: Optional[datetime],
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet

    stmt = select(Expense).where(Expense.deleted_at.is_(None))
    project_name = "All projects"
    if project_id:
        stmt = stmt.where(Expense.project_id == project_id)
        project = await db.get(Project, project_id)
        if project:
            project_name = project.name
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    stmt = stmt.order_by(Expense.expense_date)
    expenses = (await db.execute(stmt)).scalars().all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Expense Report", styles["Title"]),
        Paragraph(f"Scope: {project_name}", styles["Normal"]),
        Spacer(1, 8 * mm),
    ]

    data = [["Date", "Title", "Category", "Amount"]]
    total = 0.0
    for expense in expenses:
        total += float(expense.amount)
        data.append([
            expense.expense_date.strftime("%d %b %Y"),
            expense.title[:60],
            expense.category or "—",
            f"{expense.currency} {float(expense.amount):,.2f}",
        ])
    data.append(["", "", "Total", f"{expenses[0].currency if expenses else 'INR'} {total:,.2f}"])

    table = Table(data, colWidths=[28 * mm, 78 * mm, 34 * mm, 34 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#333333")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()
