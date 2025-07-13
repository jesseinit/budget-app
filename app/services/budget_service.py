from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import List, Optional
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from uuid import UUID
from decimal import Decimal

from app.models.budget_period import BudgetPeriod
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget_period import BudgetPeriodCreate, BudgetPeriodUpdate
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
            and_(
                BudgetPeriod.user_id == user_id,
                BudgetPeriod.start_date <= today,
                BudgetPeriod.end_date >= today,
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_current_period(self, user_id: UUID) -> BudgetPeriod:
        """Create current budget period based on user's salary day"""
        user = await self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")

        start_date, end_date = calculate_salary_period(user.salary_day)

        # Get carry forward from previous period
        carry_forward = await self._get_previous_period_balance(user_id, start_date)

        period = BudgetPeriod(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            carry_forward=carry_forward,
            status="active",
        )

        self.db.add(period)
        await self.db.commit()
        await self.db.refresh(period)

        return period

    async def get_or_create_period_for_date(
        self, user_id: UUID, transaction_date: date
    ) -> BudgetPeriod:
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

        carry_forward = await self._get_previous_period_balance(user_id, start_date)

        period = BudgetPeriod(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            carry_forward=carry_forward,
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

            await self.db.commit()

    async def _get_previous_period_balance(
        self, user_id: UUID, current_start_date: date
    ) -> Decimal:
        """Calculate balance to carry forward from previous period"""
        query = (
            select(BudgetPeriod)
            .where(
                and_(BudgetPeriod.user_id == user_id, BudgetPeriod.end_date < current_start_date)
            )
            .order_by(desc(BudgetPeriod.end_date))
            .limit(1)
        )

        result = await self.db.execute(query)
        previous_period = result.scalar_one_or_none()

        if not previous_period:
            return Decimal("0")

        # Calculate net balance from previous period
        net_balance = (
            previous_period.actual_income
            - previous_period.total_expenses
            - previous_period.total_savings
            - previous_period.total_investments
            + previous_period.carry_forward
        )

        return max(net_balance, Decimal("0"))  # Don't carry forward negative balances
