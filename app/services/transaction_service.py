from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import joinedload
from typing import List, Optional
from datetime import date
from uuid import UUID

from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.services.budget_service import BudgetService


class TransactionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.budget_service = BudgetService(db)

    async def get_transactions(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[UUID] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Transaction]:
        """Get transactions with filters"""
        query = select(Transaction).options(joinedload(Transaction.category))

        # Base filter for user
        filters = [Transaction.user_id == user_id]

        # Apply additional filters
        if category_id:
            filters.append(Transaction.category_id == category_id)
        if transaction_type:
            filters.append(Transaction.type == transaction_type)
        if start_date:
            filters.append(Transaction.transaction_date >= start_date)
        if end_date:
            filters.append(Transaction.transaction_date <= end_date)

        query = query.where(and_(*filters))
        query = query.order_by(desc(Transaction.transaction_date))
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_transaction(
        self, user_id: UUID, transaction_data: TransactionCreate
    ) -> Transaction:
        """Create a new transaction"""
        # Get or create current budget period
        budget_period = await self.budget_service.get_or_create_period_for_date(
            user_id, transaction_data.transaction_date
        )

        transaction = Transaction(
            user_id=user_id, budget_period_id=budget_period.id, **transaction_data.dict()
        )

        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)

        # Update budget period totals
        await self.budget_service.recalculate_period_totals(budget_period.id)

        return transaction

    async def get_transaction(self, transaction_id: UUID, user_id: UUID) -> Optional[Transaction]:
        """Get a specific transaction"""
        query = select(Transaction).options(joinedload(Transaction.category))
        query = query.where(and_(Transaction.id == transaction_id, Transaction.user_id == user_id))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_transaction(
        self, transaction_id: UUID, user_id: UUID, update_data: TransactionUpdate
    ) -> Optional[Transaction]:
        """Update a transaction"""
        transaction = await self.get_transaction(transaction_id, user_id)
        if not transaction:
            return None

        old_period_id = transaction.budget_period_id

        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(transaction, field, value)

        # Check if we need to move to a different budget period
        if update_data.transaction_date:
            new_period = await self.budget_service.get_or_create_period_for_date(
                user_id, update_data.transaction_date
            )
            transaction.budget_period_id = new_period.id

        await self.db.commit()
        await self.db.refresh(transaction)

        # Recalculate totals for affected periods
        await self.budget_service.recalculate_period_totals(old_period_id)
        if old_period_id != transaction.budget_period_id:
            await self.budget_service.recalculate_period_totals(transaction.budget_period_id)

        return transaction

    async def delete_transaction(self, transaction_id: UUID, user_id: UUID) -> bool:
        """Delete a transaction"""
        transaction = await self.get_transaction(transaction_id, user_id)
        if not transaction:
            return False

        period_id = transaction.budget_period_id
        await self.db.delete(transaction)
        await self.db.commit()

        # Recalculate period totals
        await self.budget_service.recalculate_period_totals(period_id)

        return True

    async def bulk_create_transactions(
        self, user_id: UUID, transactions_data: List[TransactionCreate]
    ) -> List[Transaction]:
        """Bulk create transactions"""
        transactions = []

        for transaction_data in transactions_data:
            budget_period = await self.budget_service.get_or_create_period_for_date(
                user_id, transaction_data.transaction_date
            )

            transaction = Transaction(
                user_id=user_id, budget_period_id=budget_period.id, **transaction_data.dict()
            )
            transactions.append(transaction)

        self.db.add_all(transactions)
        await self.db.commit()

        # Refresh all transactions
        for transaction in transactions:
            await self.db.refresh(transaction)

        # Recalculate totals for all affected periods
        affected_periods = set(t.budget_period_id for t in transactions)
        for period_id in affected_periods:
            await self.budget_service.recalculate_period_totals(period_id)

        return transactions
