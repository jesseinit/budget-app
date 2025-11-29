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
    period_name: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def extract_period_name(cls, data):
        """Extract period_name from the budget_period relationship"""
        if hasattr(data, "budget_period") and data.budget_period:
            # Calculate period name from budget period's started_at
            next_month = data.budget_period.started_at + timedelta(days=28)
            period_name = next_month.strftime("%B, %Y")
            # If data is a model instance, convert to dict
            if hasattr(data, "__dict__"):
                data_dict = {key: getattr(data, key) for key in data.__dict__ if not key.startswith("_")}
                data_dict["period_name"] = period_name
                return data_dict
            else:
                data["period_name"] = period_name
        return data
