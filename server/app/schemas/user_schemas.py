from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    name: str
    timezone: str = "UTC"
    currency: str = "EUR"
    salary_day: int = 1


class UserCreate(UserBase):
    oauth_provider: str
    oauth_id: str
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    salary_day: Optional[int] = None


class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    total_transactions: int
    total_budget_periods: int
    active_financial_goals: int
    days_since_signup: int
    member_since: datetime
    saving_since: Optional[datetime]


class UserProfileResponse(BaseModel):
    user: UserResponse
    stats: UserStats
