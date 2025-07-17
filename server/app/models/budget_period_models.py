import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DECIMAL, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import column_property, object_session, relationship
from sqlalchemy.sql import and_, func, select, text

from app.database import Base


class BudgetPeriod(Base):
    __tablename__ = "budget_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    expected_income = Column(DECIMAL(12, 2), default=0)
    actual_income = Column(DECIMAL(12, 2), default=0)
    total_expenses = Column(DECIMAL(12, 2), default=0)
    total_savings = Column(DECIMAL(12, 2), default=0)
    total_investments = Column(DECIMAL(12, 2), default=0)
    brought_forward = Column(DECIMAL(12, 2), default=0)  # Money brought IN from previous period
    carried_forward = Column(DECIMAL(12, 2), default=0)  # Money carried OUT to next period (calculated when completed)
    status = Column(String(20), default="active")  # active, completed, projected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    total_adjustments = column_property(
        select(func.coalesce(func.sum(text("amount")), 0))
        .select_from(text("transactions"))
        .where(text("budget_period_id = budget_periods.id AND type = 'adjustment'"))
        .scalar_subquery()
    )

    # Add next and previous period for easier navigation
    next_period_id = Column(UUID(as_uuid=True), ForeignKey("budget_periods.id"), nullable=True)
    previous_period_id = Column(UUID(as_uuid=True), ForeignKey("budget_periods.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="budget_periods")
    transactions = relationship("Transaction", back_populates="budget_period", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<BudgetPeriod(id={self.id}, user_id={self.user_id}, start_date={self.started_at}, end_date={self.ended_at})>"

    @property
    def previous_period(self):
        """Get the previous budget period if it exists"""
        session = object_session(self)
        if self.previous_period_id and session:
            return session.get(BudgetPeriod, self.previous_period_id)
        return None

    @property
    def next_period(self):
        """Get the next budget period if it exists"""
        session = object_session(self)
        if self.next_period_id and session:
            return session.get(BudgetPeriod, self.next_period_id)
        return None

    def calculate_carried_forward(self) -> Decimal:
        """Calculate how much money to carry forward to next period"""
        available_money = self.actual_income + self.brought_forward
        money_used = self.total_expenses + self.get_savings_and_investments()
        # Ensure savings/investments are not negative
        return max(Decimal(available_money + money_used), Decimal("0"))

    def get_savings_and_investments(self) -> Decimal:
        """Get total savings and investments for this period"""
        return Decimal(self.total_savings + self.total_investments)

    def calculate_net_position(self) -> Decimal:
        """Calculate net financial position for this period"""
        return self.calculate_carried_forward()

    def get_available_money(self) -> Decimal:
        """Get total money available for this period"""
        return Decimal(self.actual_income + self.brought_forward)

    def get_money_used(self) -> Decimal:
        """Get total money used in this period"""
        return Decimal(self.total_expenses) + Decimal(self.total_savings) + Decimal(self.total_investments)

    def mark_completed(self, ended_at: datetime = None):
        """Mark period as completed with optional end date"""
        if ended_at:
            self.ended_at = ended_at
        elif not self.ended_at:
            self.ended_at = datetime.now(tz=timezone.utc)

        self.carried_forward = self.calculate_carried_forward()
        self.status = "completed"
