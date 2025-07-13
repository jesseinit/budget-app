from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.utils.date_parser import date_validator


class BudgetPeriodBase(BaseModel):
    start_date: date
    end_date: date
    expected_income: Decimal = Field(default=0, decimal_places=2, description="Expected income for the period")
    brought_forward: Decimal = Field(default=0, description="Money brought in from previous period")
    carry_forward: Decimal = Field(default=0, decimal_places=2, description="Money carried out to next period")

    # Add date validators
    _start_date_validator = date_validator("start_date")
    _end_date_validator = date_validator("end_date")


class BudgetPeriodCreate(BudgetPeriodBase):
    pass


class BudgetPeriodUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    expected_income: Optional[Decimal] = Field(None, decimal_places=2)
    brought_forward: Optional[Decimal] = Field(None, decimal_places=2)

    _start_date_validator = date_validator("start_date")
    _end_date_validator = date_validator("end_date")


class BudgetPeriodResponse(BudgetPeriodBase):
    id: UUID
    user_id: UUID
    actual_income: Decimal
    total_expenses: Decimal
    total_savings: Decimal
    total_investments: Decimal
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetPeriodSummary(BudgetPeriodResponse):
    net_income: Decimal
    savings_rate: float
    expense_by_category: dict
    top_expenses: List[dict]
