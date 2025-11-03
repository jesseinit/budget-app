from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.schemas.budget_period_schemas import BudgetPeriodResponse
from app.schemas.financial_goal_schemas import FinancialGoalResponse
from app.schemas.transaction_schemas import TransactionResponse


class CategoryBreakdown(BaseModel):
    category_name: str
    category_type: str
    amount: Decimal
    percentage: float
    transaction_count: int


class MonthlyTrend(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    savings: Decimal
    investments: Decimal
    net_worth: Decimal


class YearlySummary(BaseModel):
    year: int
    total_income: Decimal
    total_expenses: Decimal
    total_savings: Decimal
    total_investments: Decimal
    net_savings: Decimal
    savings_rate: float
    periods_count: int
    monthly_trends: List[MonthlyTrend]
    category_breakdown: List[CategoryBreakdown]


class InvestmentPerformance(BaseModel):
    total_invested: Decimal
    current_value: Decimal
    profit_loss: Decimal
    profit_loss_percentage: float
    # top_investments: List[Dict[str, Any]]  # List of dictionaries with investment details


class DashboardSummary(BaseModel):
    current_period: BudgetPeriodResponse | None
    investment_performance: InvestmentPerformance
    net_worth: Decimal
    this_month_income: Decimal
    this_month_expenses: Decimal
    this_month_savings: Decimal
    savings_rate: float
    top_expense_categories: List[CategoryBreakdown]
    recent_transactions: List[TransactionResponse]
    upcoming_bills: List[Dict[str, Any]]
    financial_goals_progress: List[FinancialGoalResponse]


# Schema for Trading212 account data
class Trading212AccountData(BaseModel):
    free: Decimal
    pnl: Decimal
    ppl: Decimal
    result: Decimal
    invested: Decimal
    pieCash: Decimal
    blocked: Optional[bool] = None
