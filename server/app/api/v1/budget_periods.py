from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user_models import User
from app.schemas.budget_period_schemas import (
    BudgetPeriodCreate,
    BudgetPeriodResponse,
    BudgetPeriodSummary,
    BudgetPeriodUpdate,
    BulkRebuildRequest,
    CompletePeriodRequest,
)
from app.services.budget_service import BudgetService

router = APIRouter()


@router.get("/", response_model=List[BudgetPeriodResponse])
async def get_budget_periods(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's budget periods"""
    service = BudgetService(db)
    return await service.get_budget_periods(user_id=current_user.id, skip=skip, limit=limit, status=status)


@router.get("/current", response_model=BudgetPeriodSummary)
async def get_current_period(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current active budget period with summary"""
    service = BudgetService(db)
    period = await service.get_current_period(current_user.id)
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active budget period found. Please create a new budget period.",
        )
        # # Auto-create current period if it doesn't exist
        # period = await service.create_current_period(current_user.id)
    return await service.get_period_summary(period.id, current_user.id)


@router.post("/", response_model=BudgetPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_budget_period(
    period: BudgetPeriodCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new budget period"""
    service = BudgetService(db)
    return await service.create_budget_period(current_user.id, period)


@router.get("/{period_id}", response_model=BudgetPeriodSummary)
async def get_budget_period(
    period_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get specific budget period with summary"""
    service = BudgetService(db)
    period = await service.get_budget_period(period_id, current_user.id)
    if not period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget period not found")
    return await service.get_period_summary(period_id, current_user.id)


@router.put("/{period_id}", response_model=BudgetPeriodResponse)
async def update_budget_period(
    period_id: UUID,
    period_update: BudgetPeriodUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update budget period"""
    service = BudgetService(db)
    updated_period = await service.update_budget_period(period_id, current_user.id, period_update)
    if not updated_period:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget period not found")
    return updated_period


@router.post("/{period_id}/complete", response_model=BudgetPeriodResponse)
async def complete_budget_period(
    period_id: UUID,
    body: CompletePeriodRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Complete budget period and calculate final totals"""
    service = BudgetService(db)
    completed_period = await service.complete_budget_period(period_id, current_user.id, body.ended_at)
    return completed_period


# Two endpoints that bulk rebuild pudget periods, it takes list periods ids
@router.post("/rebuild", response_model=List[BudgetPeriodResponse])
async def rebuild_budget_periods(
    period_ids: BulkRebuildRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rebuild budget periods from a list of IDs"""
    service = BudgetService(db)
    rebuilt_periods = await service.rebuild_budget_periods(period_ids.period_ids, current_user.id)
    return rebuilt_periods
