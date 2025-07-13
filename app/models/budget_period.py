import uuid

from sqlalchemy import DECIMAL, Column, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BudgetPeriod(Base):
    __tablename__ = "budget_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    expected_income = Column(DECIMAL(12, 2), default=0)
    actual_income = Column(DECIMAL(12, 2), default=0)
    total_expenses = Column(DECIMAL(12, 2), default=0)
    total_savings = Column(DECIMAL(12, 2), default=0)
    total_investments = Column(DECIMAL(12, 2), default=0)
    carry_forward = Column(DECIMAL(12, 2), default=0)
    status = Column(String(20), default="active")  # active, completed, projected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="budget_periods")
    transactions = relationship("Transaction", back_populates="budget_period", cascade="all, delete-orphan")
