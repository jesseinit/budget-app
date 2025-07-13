# app/services/budget_service.py
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget_period import BudgetPeriod
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget_period import BudgetPeriodCreate, BudgetPeriodSummary, BudgetPeriodUpdate
from app.utils.date_utils import calculate_salary_period


class BudgetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_budget_periods(
        self, user_id: UUID, skip: int = 0, limit: int = 20, status: Optional[str] = None
    ) -> List[BudgetPeriod]:
        """Get user's budget periods"""
        query = select(BudgetPeriod).where(BudgetPeriod.user_id == user_id)

        if status:
            query = query.where(BudgetPeriod.status == status)

        query = query.order_by(desc(BudgetPeriod.start_date))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_current_period(self, user_id: UUID) -> Optional[BudgetPeriod]:
        """Get current active budget period"""
        today = date.today()
        query = select(BudgetPeriod).where(
            and_(BudgetPeriod.user_id == user_id, BudgetPeriod.start_date <= today, BudgetPeriod.end_date >= today)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_current_period(self, user_id: UUID) -> BudgetPeriod:
        """Create current budget period based on user's salary day"""
        user = await self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")

        start_date, end_date = calculate_salary_period(user.salary_day)

        # Get brought forward amount from previous period
        brought_forward = await self._get_brought_forward_amount(user_id, start_date)

        period = BudgetPeriod(
            user_id=user_id, start_date=start_date, end_date=end_date, brought_forward=brought_forward, status="active"
        )

        self.db.add(period)
        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def create_budget_period(self, user_id: UUID, period_data: BudgetPeriodCreate) -> BudgetPeriod:
        """Create a new budget period"""
        # Check for overlapping periods
        overlapping = await self._check_overlapping_periods(user_id, period_data.start_date, period_data.end_date)
        if overlapping:
            raise ValueError("Budget period overlaps with existing period")

        # If no brought_forward specified, calculate it
        if period_data.brought_forward == 0:
            brought_forward = await self._get_brought_forward_amount(user_id, period_data.start_date)
        else:
            brought_forward = period_data.brought_forward

        period = BudgetPeriod(
            user_id=user_id,
            start_date=period_data.start_date,
            end_date=period_data.end_date,
            expected_income=period_data.expected_income,
            brought_forward=brought_forward,
            carry_forward=period_data.carry_forward,
            status="active" if period_data.end_date >= date.today() else "completed",
        )

        self.db.add(period)
        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def get_budget_period(self, period_id: UUID, user_id: UUID) -> Optional[BudgetPeriod]:
        """Get specific budget period"""
        query = select(BudgetPeriod).where(and_(BudgetPeriod.id == period_id, BudgetPeriod.user_id == user_id))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_budget_period(
        self, period_id: UUID, user_id: UUID, update_data: BudgetPeriodUpdate
    ) -> Optional[BudgetPeriod]:
        """Update budget period"""
        period = await self.get_budget_period(period_id, user_id)
        if not period:
            return None

        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(period, field, value)

        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def complete_budget_period(self, period_id: UUID, user_id: UUID) -> Optional[BudgetPeriod]:
        """Mark a budget period as completed and calculate carry forward"""
        period = await self.get_budget_period(period_id, user_id)
        if not period:
            return None

        # Use the model method to mark as completed
        period.mark_completed()

        await self.db.commit()
        await self.db.refresh(period)

        # Create next period automatically if this was the current period
        if period.end_date <= date.today():
            await self._create_next_period_if_needed(user_id, period)

        return period

    async def get_period_summary(self, period_id: UUID, user_id: UUID) -> Optional[BudgetPeriodSummary]:
        """Get budget period with summary information"""
        period = await self.get_budget_period(period_id, user_id)
        if not period:
            return None

        # Get additional summary data
        expense_by_category = await self._get_expense_by_category(period_id)
        top_expenses = await self._get_top_expenses(period_id, limit=5)

        return BudgetPeriodSummary.from_budget_period(
            period, expense_by_category=expense_by_category, top_expenses=top_expenses
        )

    async def get_or_create_period_for_date(self, user_id: UUID, transaction_date: date) -> BudgetPeriod:
        """Get or create budget period for a specific date"""
        # Find existing period that contains this date
        query = select(BudgetPeriod).where(
            and_(
                BudgetPeriod.user_id == user_id,
                BudgetPeriod.start_date <= transaction_date,
                BudgetPeriod.end_date >= transaction_date,
            )
        )

        result = await self.db.execute(query)
        period = result.scalar_one_or_none()

        if period:
            return period

        # Create new period for this date
        user = await self.db.get(User, user_id)
        start_date, end_date = calculate_salary_period(user.salary_day, transaction_date)

        brought_forward = await self._get_brought_forward_amount(user_id, start_date)

        period = BudgetPeriod(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            brought_forward=brought_forward,
            status="active" if end_date >= date.today() else "completed",
        )

        self.db.add(period)
        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def recalculate_period_totals(self, period_id: UUID):
        """Recalculate budget period totals from transactions"""
        # Get totals by transaction type
        query = (
            select(Transaction.type, func.sum(Transaction.amount).label("total"))
            .where(Transaction.budget_period_id == period_id)
            .group_by(Transaction.type)
        )

        result = await self.db.execute(query)
        totals = {row.type: row.total for row in result}

        # Update budget period
        period = await self.db.get(BudgetPeriod, period_id)
        if period:
            period.actual_income = totals.get("income", 0)
            period.total_expenses = totals.get("expense", 0)
            period.total_savings = totals.get("saving", 0)
            period.total_investments = totals.get("investment", 0)
            period.updated_at = datetime.utcnow()

            # If period is completed, recalculate carry forward
            if period.status == "completed":
                period.carry_forward = period.calculate_carry_forward()

            await self.db.commit()

    # Helper methods
    async def _get_brought_forward_amount(self, user_id: UUID, current_start_date: date) -> Decimal:
        """Get amount to bring forward from previous period"""
        query = (
            select(BudgetPeriod)
            .where(and_(BudgetPeriod.user_id == user_id, BudgetPeriod.end_date < current_start_date))
            .order_by(desc(BudgetPeriod.end_date))
            .limit(1)
        )

        result = await self.db.execute(query)
        previous_period = result.scalar_one_or_none()

        if not previous_period:
            return Decimal("0")

        # If previous period is completed, use its carry_forward
        if previous_period.status == "completed":
            return previous_period.carry_forward

        # If not completed, calculate what would be carried forward
        return previous_period.calculate_carry_forward()

    async def _check_overlapping_periods(self, user_id: UUID, start_date: date, end_date: date) -> bool:
        """Check if date range overlaps with existing periods"""
        query = select(BudgetPeriod).where(
            and_(
                BudgetPeriod.user_id == user_id,
                BudgetPeriod.start_date <= end_date,
                BudgetPeriod.end_date >= start_date,
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def _create_next_period_if_needed(self, user_id: UUID, completed_period: BudgetPeriod):
        """Create next period if we're at the end of current period"""
        next_start_date = completed_period.end_date + relativedelta(days=1)

        # Check if next period already exists
        existing = await self._check_overlapping_periods(user_id, next_start_date, next_start_date)
        if existing:
            return

        # Create next period
        user = await self.db.get(User, user_id)
        next_start, next_end = calculate_salary_period(user.salary_day, next_start_date)

        next_period = BudgetPeriod(
            user_id=user_id,
            start_date=next_start,
            end_date=next_end,
            brought_forward=completed_period.carry_forward,
            status="active",
        )

        self.db.add(next_period)
        await self.db.commit()

    async def _get_expense_by_category(self, period_id: UUID) -> dict:
        """Get expenses grouped by category for a period"""
        from app.models.category import Category

        query = (
            select(Category.name, func.sum(Transaction.amount).label("total"))
            .join(Category)
            .where(and_(Transaction.budget_period_id == period_id, Transaction.type == "expense"))
            .group_by(Category.name)
        )

        result = await self.db.execute(query)
        return {row.name: float(row.total) for row in result}

    async def _get_top_expenses(self, period_id: UUID, limit: int = 5) -> List[dict]:
        """Get top expenses for a period"""
        query = (
            select(Transaction)
            .where(and_(Transaction.budget_period_id == period_id, Transaction.type == "expense"))
            .order_by(desc(Transaction.amount))
            .limit(limit)
        )

        result = await self.db.execute(query)
        transactions = result.scalars().all()

        return [
            {"description": t.description, "amount": float(t.amount), "date": t.transaction_date.isoformat()}
            for t in transactions
        ]
