from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.financial_goal import FinancialGoal
from app.schemas.financial_goal import FinancialGoalCreate, FinancialGoalUpdate


class FinancialGoalService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_financial_goals(self, user_id: UUID, is_active: Optional[bool] = None) -> List[FinancialGoal]:
        """Get user's financial goals"""
        query = select(FinancialGoal).where(FinancialGoal.user_id == user_id)

        if is_active is not None:
            query = query.where(FinancialGoal.is_active == is_active)

        query = query.order_by(FinancialGoal.target_date.asc().nullslast(), FinancialGoal.created_at.desc())

        result = await self.db.execute(query)
        goals = result.scalars().all()

        # Calculate progress and days remaining for each goal
        for goal in goals:
            goal.progress_percentage = self._calculate_progress_percentage(goal)
            goal.days_remaining = self._calculate_days_remaining(goal)

        return goals

    async def get_financial_goal(self, goal_id: UUID, user_id: UUID) -> Optional[FinancialGoal]:
        """Get a specific financial goal"""
        query = select(FinancialGoal).where(and_(FinancialGoal.id == goal_id, FinancialGoal.user_id == user_id))

        result = await self.db.execute(query)
        goal = result.scalar_one_or_none()

        if goal:
            goal.progress_percentage = self._calculate_progress_percentage(goal)
            goal.days_remaining = self._calculate_days_remaining(goal)

        return goal

    async def create_financial_goal(self, user_id: UUID, goal_data: FinancialGoalCreate) -> FinancialGoal:
        """Create a new financial goal"""
        goal = FinancialGoal(user_id=user_id, **goal_data.dict())

        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)

        # Add calculated fields
        goal.progress_percentage = self._calculate_progress_percentage(goal)
        goal.days_remaining = self._calculate_days_remaining(goal)

        return goal

    async def update_financial_goal(
        self, goal_id: UUID, user_id: UUID, update_data: FinancialGoalUpdate
    ) -> Optional[FinancialGoal]:
        """Update a financial goal"""
        goal = await self.get_financial_goal(goal_id, user_id)
        if not goal:
            return None

        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(goal, field, value)

        await self.db.commit()
        await self.db.refresh(goal)

        # Add calculated fields
        goal.progress_percentage = self._calculate_progress_percentage(goal)
        goal.days_remaining = self._calculate_days_remaining(goal)

        return goal

    async def delete_financial_goal(self, goal_id: UUID, user_id: UUID) -> bool:
        """Delete a financial goal"""
        goal = await self.get_financial_goal(goal_id, user_id)
        if not goal:
            return False

        await self.db.delete(goal)
        await self.db.commit()

        return True

    async def add_contribution(self, goal_id: UUID, user_id: UUID, amount: float) -> Optional[FinancialGoal]:
        """Add contribution to a financial goal"""
        goal = await self.get_financial_goal(goal_id, user_id)
        if not goal:
            return None

        goal.current_amount += Decimal(str(amount))

        # Check if goal is completed
        if goal.current_amount >= goal.target_amount:
            goal.is_active = False

        await self.db.commit()
        await self.db.refresh(goal)

        # Add calculated fields
        goal.progress_percentage = self._calculate_progress_percentage(goal)
        goal.days_remaining = self._calculate_days_remaining(goal)

        return goal

    def _calculate_progress_percentage(self, goal: FinancialGoal) -> float:
        """Calculate progress percentage"""
        if goal.target_amount <= 0:
            return 0.0
        return min(float((goal.current_amount / goal.target_amount) * 100), 100.0)

    def _calculate_days_remaining(self, goal: FinancialGoal) -> Optional[int]:
        """Calculate days remaining until target date"""
        if not goal.target_date:
            return None

        days_left = (goal.target_date - date.today()).days
        return max(days_left, 0)
