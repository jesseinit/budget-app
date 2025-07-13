from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FinancialGoalBase(BaseModel):
    name: str
    target_amount: Decimal = Field(..., gt=0, decimal_places=2)
    target_date: Optional[date] = None
    category: Optional[str] = None


class FinancialGoalCreate(FinancialGoalBase):
    pass


class FinancialGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    target_date: Optional[date] = None
    category: Optional[str] = None
    current_amount: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class FinancialGoalResponse(FinancialGoalBase):
    id: UUID
    user_id: UUID
    current_amount: Decimal
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    progress_percentage: float
    days_remaining: Optional[int] = None

    class Config:
        from_attributes = True
