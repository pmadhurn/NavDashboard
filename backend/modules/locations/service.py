from __future__ import annotations

import math
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundException
from shared.filters import apply_filters
from shared.pagination import PaginatedResponse, PaginationParams, paginate

from . import repository
from .models import Location, LocationHistory
from .schemas import (
    LocationCreate,
    LocationHistoryResponse,
    LocationResponse,
    LocationUpdate,
)


def _to_response(location: Location) -> LocationResponse:
    return LocationResponse.model_validate(location, from_attributes=True)


async def create_location(
    db: AsyncSession, location_in: LocationCreate
) -> LocationResponse:
    location = await repository.create(db, location_in)
    return _to_response(location)


async def update_location(
    db: AsyncSession, location_id: UUID, location_in: LocationUpdate
) -> LocationResponse:
    location = await repository.update(db, location_id, location_in)
    if not location:
        raise NotFoundException("Location not found")
    return _to_response(location)


async def get_location(db: AsyncSession, location_id: UUID) -> LocationResponse:
    location = await repository.get_by_id(db, location_id)
    if not location:
        raise NotFoundException("Location not found")
    return _to_response(location)


async def get_location_history_for_couple(
    db: AsyncSession, couple_id: UUID, params: PaginationParams
) -> PaginatedResponse[LocationHistoryResponse]:
    query = (
        select(LocationHistory)
        .where(LocationHistory.couple_id == couple_id)
        .order_by(LocationHistory.moved_at.desc())
    )
    return await paginate(db, query, params, LocationHistoryResponse)


async def get_all_location_history(
    db: AsyncSession,
    params: PaginationParams,
    filters: Optional[dict] = None,
) -> PaginatedResponse[LocationHistoryResponse]:
    query = select(LocationHistory).order_by(LocationHistory.moved_at.desc())
    if filters:
        query = apply_filters(query, LocationHistory, filters)
    return await paginate(db, query, params, LocationHistoryResponse)


def calculate_distance(
    lat1: float, lng1: float, lat2: float, lng2: float
) -> float:
    R = 6_371_000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
