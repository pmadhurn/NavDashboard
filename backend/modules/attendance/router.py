from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import (
    assert_scope,
    get_current_person_id,
    get_current_user,
    person_from_body,
    person_from_path,
    require_permission,
)
from core.exceptions import BadRequestException
from modules.attendance import service
from modules.attendance.schemas import (
    AttendanceDayCreate,
    AttendanceDayResponse,
    AttendanceDayUpdate,
    AttendanceSummary,
    CompOffAdjust,
    CompOffBalance,
    CompOffEntryResponse,
)

router = APIRouter()


def _default_range(
    date_from: Optional[date], date_to: Optional[date]
) -> tuple[date, date]:
    """Default to the current month — the window an attendance page opens on."""
    today = date.today()
    if date_to is None:
        date_to = today
    if date_from is None:
        date_from = today.replace(day=1)
    if date_from > date_to:
        raise BadRequestException("date_from is after date_to")
    if (date_to - date_from) > timedelta(days=400):
        raise BadRequestException("Range is longer than 400 days")
    return date_from, date_to


# --- the caller's own attendance -------------------------------------------
# These carry no scope resolver on purpose: they are hard-scoped to the caller
# in the handler, so a SELF-scoped technician needs no grant beyond VIEW/EDIT.


@router.get("/me", response_model=list[AttendanceDayResponse])
async def my_days(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "VIEW")),
):
    person_id = await get_current_person_id(db, user)
    if person_id is None:
        return []
    date_from, date_to = _default_range(date_from, date_to)
    return await service.list_days(
        db, person_id=person_id, date_from=date_from, date_to=date_to
    )


@router.get("/me/summary", response_model=AttendanceSummary)
async def my_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "VIEW")),
):
    person_id = await get_current_person_id(db, user)
    if person_id is None:
        raise BadRequestException(
            "This login is not linked to a personnel record, so it has no attendance"
        )
    date_from, date_to = _default_range(date_from, date_to)
    return await service.summary(db, person_id, date_from, date_to)


@router.get("/me/comp-off", response_model=CompOffBalance)
async def my_comp_off(
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "VIEW")),
):
    person_id = await get_current_person_id(db, user)
    if person_id is None:
        raise BadRequestException(
            "This login is not linked to a personnel record"
        )
    return await service.comp_off_balance(db, person_id)


# --- logging and editing ----------------------------------------------------


@router.post("", response_model=AttendanceDayResponse, status_code=201)
async def log_day(
    body: AttendanceDayCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission(
            "attendance", "EDIT", scope_owner=person_from_body("person_id")
        )
    ),
):
    return await service.log_day(db, body, user.id)


@router.put("/{entry_id}", response_model=AttendanceDayResponse)
async def update_day(
    entry_id: UUID,
    body: AttendanceDayUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "EDIT")),
):
    # The target person is on the stored row, not in the request, so the scope
    # check happens here rather than in the dependency.
    owner = await service.get_day_owner(db, entry_id)
    await assert_scope(db, user, "attendance", owner)
    return await service.update_day(db, entry_id, body, user.id)


@router.delete("/{entry_id}", status_code=204)
async def delete_day(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "EDIT")),
):
    owner = await service.get_day_owner(db, entry_id)
    await assert_scope(db, user, "attendance", owner)
    await service.delete_day(db, entry_id, user.id)


# --- other people -----------------------------------------------------------


@router.get("/person/{person_id}", response_model=list[AttendanceDayResponse])
async def person_days(
    person_id: UUID,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission("attendance", "VIEW", scope_owner=person_from_path("person_id"))
    ),
):
    date_from, date_to = _default_range(date_from, date_to)
    return await service.list_days(
        db, person_id=person_id, date_from=date_from, date_to=date_to
    )


@router.get("/person/{person_id}/summary", response_model=AttendanceSummary)
async def person_summary(
    person_id: UUID,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission("attendance", "VIEW", scope_owner=person_from_path("person_id"))
    ),
):
    date_from, date_to = _default_range(date_from, date_to)
    return await service.summary(db, person_id, date_from, date_to)


@router.get("/board", response_model=list[AttendanceDayResponse])
async def team_board(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("attendance", "VIEW")),
):
    """Everyone's logged days in a range.

    Filtered down to what the caller's scope allows rather than 403-ing the
    whole board: a SELF-scoped technician opening the team view should see their
    own row, not an error page.
    """
    date_from, date_to = _default_range(date_from, date_to)
    rows = await service.list_days(db, date_from=date_from, date_to=date_to)

    visible = []
    for row in rows:
        try:
            await assert_scope(db, user, "attendance", row["person_id"])
        except Exception:
            continue
        visible.append(row)
    return visible


# --- comp-off ---------------------------------------------------------------


@router.get("/comp-off/{person_id}", response_model=CompOffBalance)
async def comp_off_balance(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission("attendance", "VIEW", scope_owner=person_from_path("person_id"))
    ),
):
    return await service.comp_off_balance(db, person_id)


@router.get("/comp-off/{person_id}/ledger", response_model=list[CompOffEntryResponse])
async def comp_off_ledger(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission("attendance", "VIEW", scope_owner=person_from_path("person_id"))
    ),
):
    return await service.list_comp_off(db, person_id)


@router.post("/comp-off/adjust", response_model=CompOffEntryResponse, status_code=201)
async def adjust_comp_off(
    body: CompOffAdjust,
    db: AsyncSession = Depends(get_db),
    user=Depends(
        require_permission(
            "attendance", "MANAGE", scope_owner=person_from_body("person_id")
        )
    ),
):
    """Manual correction. MANAGE, not EDIT — granting yourself days is not the
    same act as recording where you were."""
    return await service.adjust_comp_off(
        db, body.person_id, body.days, body.reason, user.id
    )
