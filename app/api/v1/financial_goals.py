from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.financial_goal import (
    FinancialGoalCreate,
    FinancialGoalResponse,
    FinancialGoalUpdate,
)
from app.services.financial_goal_service import FinancialGoalService

router = APIRouter()


@router.get("/", response_model=List[FinancialGoalResponse])
async def get_financial_goals(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's financial goals"""
    service = FinancialGoalService(db)
    return await service.get_financial_goals(current_user.id, is_active)


@router.post("/", response_model=FinancialGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_financial_goal(
    goal: FinancialGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new financial goal"""
    service = FinancialGoalService(db)
    return await service.create_financial_goal(current_user.id, goal)


@router.get("/{goal_id}", response_model=FinancialGoalResponse)
async def get_financial_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific financial goal"""
    service = FinancialGoalService(db)
    goal = await service.get_financial_goal(goal_id, current_user.id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial goal not found")
    return goal


@router.put("/{goal_id}", response_model=FinancialGoalResponse)
async def update_financial_goal(
    goal_id: UUID,
    goal_update: FinancialGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a financial goal"""
    service = FinancialGoalService(db)
    updated_goal = await service.update_financial_goal(goal_id, current_user.id, goal_update)
    if not updated_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial goal not found")
    return updated_goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_financial_goal(
    goal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a financial goal"""
    service = FinancialGoalService(db)
    success = await service.delete_financial_goal(goal_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial goal not found")


@router.patch("/{goal_id}/contribute")
async def contribute_to_goal(
    goal_id: UUID,
    amount: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add contribution to a financial goal"""
    service = FinancialGoalService(db)
    updated_goal = await service.add_contribution(goal_id, current_user.id, amount)
    if not updated_goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Financial goal not found")
    return {
        "message": "Contribution added successfully",
        "new_amount": updated_goal.current_amount,
        "progress": (updated_goal.current_amount / updated_goal.target_amount) * 100,
    }
