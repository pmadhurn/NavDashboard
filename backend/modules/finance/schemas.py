from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PersonBrief(BaseModel):
    id: UUID
    full_name: str

    model_config = {"from_attributes": True}


class ExpenseMemberResponse(BaseModel):
    id: UUID
    person: PersonBrief

    model_config = {"from_attributes": True}


# The categories the team actually uses; "Other" allows free text.
EXPENSE_CATEGORIES = [
    "Hotel",
    "Food",
    "Air travel",
    "Cab",
    "Rickshaw",
    "Bus",
    "Train",
    "Other",
]

EXPENSE_STATUSES = ["DRAFT", "SUBMITTED", "PAID", "REJECTED"]
CLAIM_STATUSES = ["DRAFT", "SUBMITTED", "PARTIALLY_PAID", "PAID", "REJECTED"]


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    amount: float = Field(gt=0)
    currency: str = "INR"
    expense_date: Optional[datetime] = None
    category: Optional[str] = None
    project_id: Optional[UUID] = None
    batch_id: Optional[UUID] = None
    claim_id: Optional[UUID] = None
    notes: Optional[str] = None
    member_person_ids: list[UUID] = []


class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[datetime] = None
    category: Optional[str] = None
    project_id: Optional[UUID] = None
    batch_id: Optional[UUID] = None
    notes: Optional[str] = None
    member_person_ids: Optional[list[UUID]] = None


class ExpenseResponse(BaseModel):
    id: UUID
    title: str
    amount: float
    currency: str
    expense_date: datetime
    category: Optional[str] = None
    project_id: Optional[UUID] = None
    batch_id: Optional[UUID] = None
    claim_id: Optional[UUID] = None
    added_by: UUID
    notes: Optional[str] = None
    status: str = "SUBMITTED"
    paid_by: Optional[UUID] = None
    paid_at: Optional[datetime] = None
    members: list[ExpenseMemberResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Advances (funds received from office) ---

class AdvanceCreate(BaseModel):
    person_id: UUID
    project_id: Optional[UUID] = None
    amount: float = Field(gt=0)
    currency: str = "INR"
    received_date: Optional[datetime] = None
    source_note: Optional[str] = None


class AdvanceResponse(BaseModel):
    id: UUID
    person_id: UUID
    person: Optional[PersonBrief] = None
    project_id: Optional[UUID] = None
    amount: float
    currency: str
    received_date: datetime
    source_note: Optional[str] = None
    logged_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    person_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    advances: float = 0
    spent: float = 0
    balance: float = 0


# --- Claims (team lead bundles expenses for finance) ---

class ClaimCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    project_id: Optional[UUID] = None
    note: Optional[str] = None
    expense_ids: list[UUID] = []


class ClaimUpdate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None
    add_expense_ids: list[UUID] = []
    remove_expense_ids: list[UUID] = []


class ClaimSettle(BaseModel):
    status: str  # PAID | REJECTED | PARTIALLY_PAID


class ClaimResponse(BaseModel):
    id: UUID
    title: str
    project_id: Optional[UUID] = None
    submitted_by: UUID
    status: str
    note: Optional[str] = None
    submitted_at: Optional[datetime] = None
    settled_by: Optional[UUID] = None
    settled_at: Optional[datetime] = None
    total: float = 0
    expense_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseStatusUpdate(BaseModel):
    status: str  # SUBMITTED | PAID | REJECTED


# --- Dashboards ---

class MyFinanceSummary(BaseModel):
    person_id: Optional[UUID] = None
    advances: float = 0
    spent: float = 0
    balance: float = 0
    pending_total: float = 0
    paid_total: float = 0
    expense_count: int = 0
    claim_count: int = 0


class SettlementPerson(BaseModel):
    person_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    name: str
    advances: float = 0
    spent: float = 0
    balance: float = 0
    pending: float = 0
    paid: float = 0


class SettlementProject(BaseModel):
    project_id: Optional[UUID] = None
    name: str
    total: float = 0
    pending: float = 0
    paid: float = 0


class SettlementSummary(BaseModel):
    total_pending: float = 0
    total_paid: float = 0
    by_person: list[SettlementPerson] = []
    by_project: list[SettlementProject] = []


class ExpenseSummary(BaseModel):
    total_this_month: float
    total_all_time: float
    count: int
    by_project: list[dict]
    by_category: list[dict]


class BatchCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    notes: Optional[str] = None


class BatchResponse(BaseModel):
    id: UUID
    title: str
    notes: Optional[str] = None
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ImportResult(BaseModel):
    created: int
    skipped: int
    errors: list[str] = []
