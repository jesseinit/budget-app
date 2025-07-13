from datetime import date, datetime, time, timezone, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, computed_field

from app.schemas.transaction import TransactionResponse


class BudgetPeriodBase(BaseModel):
    started_at: datetime  # Only required field

    @field_validator("started_at", mode="before")
    def parse_started_at(cls, v):
        if isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, time.min, tzinfo=timezone.utc)
        return v

    @computed_field
    def period_name(self) -> str:
        # Format period name as "Month Name - Year" of the next month
        next_month = self.started_at + timedelta(days=28)
        # format the month and year
        return next_month.strftime("%B, %Y")


class BudgetPeriodCreate(BudgetPeriodBase):
    # All other fields are optional during creation
    ended_at: Optional[datetime] = None
    expected_income: Optional[Decimal] = Field(None, decimal_places=2)
    brought_forward: Optional[Decimal] = Field(None, decimal_places=2)
    carried_forward: Optional[Decimal] = Field(None, decimal_places=2)

    @field_validator("ended_at", mode="before")
    def parse_ended_at(cls, v):
        if v is not None and isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, time.min, tzinfo=timezone.utc)
        return v


class BudgetPeriodUpdate(BaseModel):
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    expected_income: Optional[Decimal] = Field(None, decimal_places=2)
    brought_forward: Optional[Decimal] = Field(None, decimal_places=2)

    @field_validator("started_at", "ended_at", mode="before")
    def parse_dates(cls, v):
        if v is not None and isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, time.min, tzinfo=timezone.utc)
        return v


class BudgetPeriodResponse(BaseModel):
    id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    expected_income: Decimal
    brought_forward: Decimal
    carried_forward: Decimal
    actual_income: Decimal
    total_expenses: Decimal
    total_savings: Decimal
    total_investments: Decimal
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @computed_field
    def period_name(self) -> str:
        # Format period name as "Month Name - Year" of the next month
        next_month = self.started_at + timedelta(days=28)
        # format the month and year
        return next_month.strftime("%B, %Y")


class BudgetPeriodSummary(BudgetPeriodResponse):
    net_income: Decimal
    savings_rate: float
    expense_by_category: dict
    top_expenses: List[dict]
    transactions: List[TransactionResponse] = []

    @classmethod
    def from_budget_period(cls, period, **kwargs):
        """Create summary from BudgetPeriod model with calculated fields"""

        # Calculate available money (income + brought forward)
        available_money = period.actual_income + period.brought_forward

        # Calculate money used (expenses + savings + investments)
        money_used = period.total_expenses + period.total_savings + period.total_investments

        # Calculate net position (what's left over)
        net_position = available_money - money_used

        # Calculate savings rate as percentage
        total_saved = period.total_savings + period.total_investments
        if available_money > 0:
            savings_rate = float((total_saved / available_money) * 100)
        else:
            savings_rate = 0.0

        # Build the complete data dictionary
        summary_data = {
            "id": period.id,
            "user_id": period.user_id,
            "started_at": period.started_at,
            "ended_at": period.ended_at,
            "expected_income": period.expected_income,
            "brought_forward": period.brought_forward,
            "carried_forward": period.carried_forward,
            "actual_income": period.actual_income,
            "total_expenses": period.total_expenses,
            "total_savings": period.total_savings,
            "total_investments": period.total_investments,
            "status": period.status,
            "created_at": period.created_at,
            "updated_at": period.updated_at,
            # Calculated fields
            "available_money": available_money,
            "money_used": money_used,
            "net_income": net_position,
            "savings_rate": savings_rate,
            # Default empty values (will be overridden by kwargs)
            "expense_by_category": {},
            "top_expenses": [],
            "transactions": [],
        }

        # Add any additional data passed in kwargs
        summary_data.update(kwargs)

        return cls(**summary_data)


class CompletePeriodRequest(BaseModel):
    ended_at: Optional[datetime] = None


class BulkRebuildRequest(BaseModel):
    period_ids: List[UUID]
