from typing import Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        return await self.db.get(User, user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_oauth(self, oauth_provider: str, oauth_id: str) -> Optional[User]:
        """Get user by OAuth provider and ID"""
        query = select(User).where(and_(User.oauth_provider == oauth_provider, User.oauth_id == oauth_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        user = User(**user_data.dict())
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user(self, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
        """Update user information"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        # Update only provided fields
        for field, value in user_update.model_dump(exclude_unset=True).items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_salary_day(self, user_id: UUID, salary_day: int) -> Optional[User]:
        """Update user's salary day"""
        if salary_day < 1 or salary_day > 31:
            raise ValueError("Salary day must be between 1 and 31")

        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        user.salary_day = salary_day
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete a user and all associated data"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True

    async def get_user_stats(self, user_id: UUID) -> dict:
        """Get user statistics"""
        from sqlalchemy import func

        from app.models.budget_period import BudgetPeriod
        from app.models.financial_goal import FinancialGoal
        from app.models.transaction import Transaction

        # Count transactions
        transaction_count_query = select(func.count(Transaction.id)).where(Transaction.user_id == user_id)
        transaction_count_result = await self.db.execute(transaction_count_query)
        transaction_count = transaction_count_result.scalar()

        # Count budget periods
        period_count_query = select(func.count(BudgetPeriod.id)).where(BudgetPeriod.user_id == user_id)
        period_count_result = await self.db.execute(period_count_query)
        period_count = period_count_result.scalar()

        # Count financial goals
        goal_count_query = select(func.count(FinancialGoal.id)).where(
            and_(FinancialGoal.user_id == user_id, FinancialGoal.is_active is True)
        )
        goal_count_result = await self.db.execute(goal_count_query)
        goal_count = goal_count_result.scalar()

        # Get user creation date
        user = await self.get_user_by_id(user_id)
        days_since_signup = (user.created_at.date() - user.created_at.date()).days if user else 0

        return {
            "total_transactions": transaction_count or 0,
            "total_budget_periods": period_count or 0,
            "active_financial_goals": goal_count or 0,
            "days_since_signup": days_since_signup,
            "member_since": user.created_at.date() if user else None,
        }
