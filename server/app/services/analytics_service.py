import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, or_, desc, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models import BudgetPeriod, Category, FinancialGoal, Transaction
from app.schemas import CategoryBreakdown, DashboardSummary, MonthlyTrend, YearlySummary

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_summary(self, user_id: UUID) -> DashboardSummary:
        """Get comprehensive dashboard summary"""
        # Get current period
        current_period = await self._get_current_period(user_id)

        # Calculate total balance
        total_balance = await self._calculate_total_balance(user_id)

        # Get this month's totals
        month_totals = await self._get_month_totals(user_id)

        # Calculate savings rate
        savings_rate = self._calculate_savings_rate(
            month_totals["income"], month_totals["savings"] + month_totals["investments"]
        )

        # Get top expense categories
        top_categories = await self._get_top_expense_categories(user_id, current_period.id if current_period else None)

        # Get recent transactions
        recent_transactions = await self._get_recent_transactions(user_id, limit=10)

        # Get financial goals progress
        goals_progress = await self._get_financial_goals_progress(user_id)

        return DashboardSummary(
            current_period=current_period,
            total_balance=total_balance,
            this_month_income=month_totals["income"],
            this_month_expenses=month_totals["expenses"],
            this_month_savings=month_totals["savings"],
            savings_rate=savings_rate,
            top_expense_categories=top_categories,
            recent_transactions=recent_transactions,
            upcoming_bills=[],  # TODO: Implement recurring transactions
            financial_goals_progress=goals_progress,
        )

    async def get_yearly_summary(self, user_id: UUID, year: int) -> YearlySummary:
        """Get yearly financial summary"""
        # Get all periods for the year
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)

        query = (
            select(BudgetPeriod)
            .options(selectinload(BudgetPeriod.transactions))
            .where(
                and_(
                    BudgetPeriod.user_id == user_id,
                    BudgetPeriod.started_at <= end_date,
                    or_(
                        BudgetPeriod.ended_at.is_(None),
                        BudgetPeriod.ended_at >= start_date,
                    ),
                )
            )
            .order_by(BudgetPeriod.started_at)
        )

        result = await self.db.execute(query)
        periods = result.scalars().all()

        # Calculate totals
        total_income = sum(p.actual_income for p in periods)
        total_expenses = sum(p.total_expenses for p in periods)
        total_savings = sum(p.total_savings for p in periods)
        total_investments = sum(p.total_investments for p in periods)

        net_savings = total_savings + total_investments
        savings_rate = self._calculate_savings_rate(total_income, net_savings)

        # Get monthly trends
        monthly_trends = await self._get_monthly_trends(user_id, year)

        # Get category breakdown
        category_breakdown = await self._get_yearly_category_breakdown(user_id, year)

        return YearlySummary(
            year=year,
            total_income=total_income,
            total_expenses=total_expenses,
            total_savings=total_savings,
            total_investments=total_investments,
            net_savings=net_savings,
            savings_rate=savings_rate,
            periods_count=len(periods),
            monthly_trends=monthly_trends,
            category_breakdown=category_breakdown,
        )

    async def get_spending_trends(self, user_id: UUID, months: int) -> List[Dict[str, Any]]:
        """Get spending trends over specified number of months"""
        end_date = date.today()
        start_date = end_date - relativedelta(months=months)

        query = (
            select(
                extract("year", Transaction.transacted_at).label("year"),
                extract("month", Transaction.transacted_at).label("month"),
                func.sum(Transaction.amount).label("total_amount"),
                Transaction.type,
            )
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transacted_at >= start_date,
                    Transaction.transacted_at <= end_date,
                )
            )
            .group_by(
                extract("year", Transaction.transacted_at),
                extract("month", Transaction.transacted_at),
                Transaction.type,
            )
            .order_by("year", "month")
        )

        result = await self.db.execute(query)
        trends = result.fetchall()

        # Format the results
        formatted_trends = []
        for trend in trends:
            formatted_trends.append(
                {
                    "year": int(trend.year),
                    "month": int(trend.month),
                    "type": trend.type,
                    "amount": float(trend.total_amount),
                }
            )

        return formatted_trends

    async def get_category_breakdown(self, user_id: UUID, period_id: Optional[UUID] = None) -> List[CategoryBreakdown]:
        """Get category breakdown for a specific period or current period"""
        if period_id:
            period_filter = Transaction.budget_period_id == period_id
        else:
            # Get current period
            current_period = await self._get_current_period(user_id)
            if not current_period:
                return []
            period_filter = Transaction.budget_period_id == current_period.id

        query = (
            select(
                Category.name.label("category_name"),
                Category.type.label("category_type"),
                func.sum(Transaction.amount).label("amount"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Category)
            .where(and_(Transaction.user_id == user_id, period_filter))
            .group_by(Category.name, Category.type)
        )

        result = await self.db.execute(query)
        breakdown_data = result.fetchall()

        # Calculate total for percentages
        total_amount = sum(item.amount for item in breakdown_data)

        # Format results
        breakdown = []
        for item in breakdown_data:
            percentage = float((item.amount / total_amount) * 100) if total_amount > 0 else 0
            breakdown.append(
                CategoryBreakdown(
                    category_name=item.category_name,
                    category_type=item.category_type,
                    amount=item.amount,
                    percentage=percentage,
                    transaction_count=item.transaction_count,
                )
            )

        return breakdown

    # Helper methods
    async def _get_current_period(self, user_id: UUID) -> Optional[BudgetPeriod]:
        """Get current active budget period"""
        today = datetime.now(timezone.utc)
        query = select(BudgetPeriod).where(
            and_(
                BudgetPeriod.user_id == user_id,
                BudgetPeriod.started_at <= today,
                BudgetPeriod.ended_at.is_(None),
                BudgetPeriod.status == "active",
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _calculate_total_balance(self, user_id: UUID) -> Decimal:
        """Calculate total balance across all periods"""
        # Get all completed budget periods
        query = select(BudgetPeriod).where(and_(BudgetPeriod.user_id == user_id))
        # query = select(BudgetPeriod).where(and_(BudgetPeriod.user_id == user_id, BudgetPeriod.status == "completed"))

        result = await self.db.execute(query)
        periods = result.scalars().all()

        total_balance = Decimal("0")
        for period in periods:
            period_balance = (
                period.actual_income
                - period.total_expenses
                - period.total_savings
                - period.total_investments
                + period.carried_forward
            )
            total_balance += period_balance

        return total_balance

    async def _get_month_totals(self, user_id: UUID) -> Dict[str, Decimal]:
        """Get current month's totals"""
        current_period = await self._get_current_period(user_id)

        if not current_period:
            return {
                "income": Decimal("0"),
                "expenses": Decimal("0"),
                "savings": Decimal("0"),
                "investments": Decimal("0"),
            }

        return {
            "income": current_period.actual_income,
            "expenses": current_period.total_expenses,
            "savings": current_period.total_savings,
            "investments": current_period.total_investments,
        }

    async def _get_top_expense_categories(self, user_id: UUID, period_id: Optional[UUID]) -> List[CategoryBreakdown]:
        """Get top expense categories for a period"""
        if not period_id:
            return []

        query = (
            select(
                Category.name.label("category_name"),
                Category.type.label("category_type"),
                func.sum(Transaction.amount).label("amount"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Category)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.budget_period_id == period_id,
                    Transaction.type == "expense",
                )
            )
            .group_by(Category.name, Category.type)
            .order_by(desc(func.sum(Transaction.amount)))
            .limit(5)
        )

        result = await self.db.execute(query)
        top_expenses = result.fetchall()

        # Calculate total expenses for percentages
        total_query = select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.budget_period_id == period_id,
                Transaction.type == "expense",
            )
        )
        total_result = await self.db.execute(total_query)
        total_expenses = total_result.scalar() or Decimal("0")

        categories = []
        for expense in top_expenses:
            percentage = float((expense.amount / total_expenses) * 100) if total_expenses > 0 else 0
            categories.append(
                CategoryBreakdown(
                    category_name=expense.category_name,
                    category_type=expense.category_type,
                    amount=expense.amount,
                    percentage=percentage,
                    transaction_count=expense.transaction_count,
                )
            )

        return categories

    async def _get_recent_transactions(self, user_id: UUID, limit: int = 10) -> List[Transaction]:
        """Get recent transactions"""
        query = (
            select(Transaction)
            .options(joinedload(Transaction.category))
            .where(Transaction.user_id == user_id)
            .order_by(desc(Transaction.transacted_at), desc(Transaction.created_at))
            .limit(limit)
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def _get_financial_goals_progress(self, user_id: UUID) -> List[FinancialGoal]:
        """Get financial goals with progress"""
        query = (
            select(FinancialGoal)
            .where(and_(FinancialGoal.user_id == user_id, FinancialGoal.is_active is True))
            .order_by(FinancialGoal.target_date.asc().nullslast())
        )

        result = await self.db.execute(query)
        goals = result.scalars().all()

        # Add calculated fields
        for goal in goals:
            goal.progress_percentage = self._calculate_progress_percentage(goal)
            goal.days_remaining = self._calculate_days_remaining(goal)

        return goals

    async def _get_monthly_trends(self, user_id: UUID, year: int) -> List[MonthlyTrend]:
        """Get monthly trends for a year"""
        trends = []

        for month in range(1, 13):
            month_start = date(year, month, 1)
            if month == 12:
                month_end = date(year + 1, 1, 1) - relativedelta(days=1)
            else:
                month_end = date(year, month + 1, 1) - relativedelta(days=1)

            # Get transactions for this month
            query = (
                select(Transaction.type, func.sum(Transaction.amount).label("total"))
                .where(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.transacted_at >= month_start,
                        Transaction.transacted_at <= month_end,
                    )
                )
                .group_by(Transaction.type)
            )

            result = await self.db.execute(query)
            month_data = {row.type: row.total for row in result}

            trends.append(
                MonthlyTrend(
                    month=f"{year}-{month:02d}",
                    income=month_data.get("income", Decimal("0")),
                    expenses=month_data.get("expense", Decimal("0")),
                    savings=month_data.get("saving", Decimal("0")),
                    investments=month_data.get("investment", Decimal("0")),
                    net_worth=month_data.get("income", Decimal("0")) - month_data.get("expense", Decimal("0")),
                )
            )

        return trends

    async def _get_yearly_category_breakdown(self, user_id: UUID, year: int) -> List[CategoryBreakdown]:
        """Get category breakdown for entire year"""
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)

        query = (
            select(
                Category.name.label("category_name"),
                Category.type.label("category_type"),
                func.sum(Transaction.amount).label("amount"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Category)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.transacted_at >= start_date,
                    Transaction.transacted_at <= end_date,
                )
            )
            .group_by(Category.name, Category.type)
        )

        result = await self.db.execute(query)
        breakdown_data = result.fetchall()

        # Calculate total for percentages
        total_amount = sum(item.amount for item in breakdown_data)

        breakdown = []
        for item in breakdown_data:
            percentage = float((item.amount / total_amount) * 100) if total_amount > 0 else 0
            breakdown.append(
                CategoryBreakdown(
                    category_name=item.category_name,
                    category_type=item.category_type,
                    amount=item.amount,
                    percentage=percentage,
                    transaction_count=item.transaction_count,
                )
            )

        return breakdown

    def _calculate_savings_rate(self, income: Decimal, savings: Decimal) -> float:
        """Calculate savings rate as percentage"""
        if income <= 0:
            return 0.0
        return float((savings / income) * 100)

    def _calculate_progress_percentage(self, goal: FinancialGoal) -> float:
        """Calculate progress percentage for a financial goal"""
        if goal.target_amount <= 0:
            return 0.0
        return min(float((goal.current_amount / goal.target_amount) * 100), 100.0)

    def _calculate_days_remaining(self, goal: FinancialGoal) -> Optional[int]:
        """Calculate days remaining until target date"""
        if not goal.target_date:
            return None

        days_left = (goal.target_date - date.today()).days
        return max(days_left, 0)
