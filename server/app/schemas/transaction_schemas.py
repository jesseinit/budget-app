from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

from app.schemas.category_schemas import CategoryResponse


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"
    SAVING = "saving"
    INVESTMENT = "investment"
    ADJUSTMENT = "adjustment"


class TransactionBase(BaseModel):
    amount: Decimal = Field(..., decimal_places=2)
    description: Optional[str] = None
    transacted_at: datetime
    type: TransactionType  # Now restricted to specific values
    payment_method: Optional[str] = None
    tags: Optional[List[str]] = None

    @field_validator("transacted_at", mode="before")
    def parse_transacted_at(cls, v):
        if isinstance(v, date) and not isinstance(v, datetime):
            return datetime.combine(v, time.min, tzinfo=timezone.utc)
        if isinstance(v, datetime):
            return v
        return v


class TransactionCreate(TransactionBase):
    category_id: UUID
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None

    @field_validator("recurring_frequency")
    def validate_recurring_frequency(cls, v, values):
        if values.data.get("is_recurring") and not v:
            raise ValueError("recurring_frequency is required when is_recurring is True")
        return v


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    description: Optional[str] = None
    transacted_at: Optional[date] = None
    category_id: Optional[UUID] = None
    payment_method: Optional[str] = None
    tags: Optional[List[str]] = None


class TransactionResponse(TransactionBase):
    id: UUID
    user_id: UUID
    budget_period_id: UUID
    category_id: UUID
    is_recurring: bool
    recurring_frequency: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    # add computed property that returns period name(Month - Year) based transacted_at


class TransactionWithCategory(TransactionResponse):
    category: CategoryResponse

    @computed_field
    def period_name(self) -> str:
        # Format period name as "Month Name - Year" of the next month
        next_month = self.transacted_at + timedelta(days=28)
        # format the month and year
        return next_month.strftime("%B, %Y")
