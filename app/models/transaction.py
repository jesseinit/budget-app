import uuid

from sqlalchemy import DECIMAL, Boolean, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    budget_period_id = Column(UUID(as_uuid=True), ForeignKey("budget_periods.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    amount = Column(DECIMAL(12, 2), nullable=False)
    description = Column(Text)
    transaction_date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)  # income, expense, saving, investment
    payment_method = Column(String(50))  # cash, card, bank_transfer, digital_wallet
    is_recurring = Column(Boolean, default=False)
    recurring_frequency = Column(String(20))  # daily, weekly, monthly, yearly
    tags = Column(ARRAY(String))
    receipt_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    budget_period = relationship("BudgetPeriod", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
