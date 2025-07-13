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
    brought_forward = Column(DECIMAL(12, 2), default=0)  # Money brought IN from previous period
    carry_forward = Column(DECIMAL(12, 2), default=0)  # Money carried OUT to next period (calculated when completed)
    status = Column(String(20), default="active")  # active, completed, projected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="budget_periods")
    transactions = relationship("Transaction", back_populates="budget_period", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BudgetPeriod(id={self.id}, user_id={self.user_id}, start_date={self.start_date}, end_date={self.end_date})>"

    def calculate_carry_forward(self) -> DECIMAL:
        """Calculate how much money to carry forward to next period"""
        available_money = self.actual_income + self.brought_forward
        money_used = self.total_expenses + self.total_savings + self.total_investments
        return max(available_money - money_used, DECIMAL("0"))  # Don't carry forward negative amounts

    def calculate_net_position(self) -> DECIMAL:
        """Calculate net financial position for this period"""
        return self.calculate_carry_forward()

    def get_available_money(self) -> DECIMAL:
        """Get total money available for this period"""
        return self.actual_income + self.brought_forward

    def get_money_used(self) -> DECIMAL:
        """Get total money used in this period"""
        return self.total_expenses + self.total_savings + self.total_investments

    def mark_completed(self):
        """Mark period as completed and calculate carry forward"""
        self.carry_forward = self.calculate_carry_forward()
        self.status = "completed"
