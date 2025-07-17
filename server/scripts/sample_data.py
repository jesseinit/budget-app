"""Create sample data for testing"""

import asyncio
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.user_models import User
from app.models.category_models import Category
from app.models.transaction_models import Transaction
from app.models.budget_period_models import BudgetPeriod
from app.models.financial_goal_models import FinancialGoal
from app.services.budget_service import BudgetService
import random
from scripts.init_database import create_default_categories


async def create_sample_user():
    """Create a sample user for testing"""
    async with AsyncSessionLocal() as db:
        user = User(
            email="test@example.com",
            name="Test User",
            oauth_provider="google",
            oauth_id="test123",
            currency="USD",
            salary_day=1,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


async def create_sample_transactions(user_id, db: AsyncSession):
    """Create sample transactions for the past 6 months"""
    budget_service = BudgetService(db)

    # Get user's categories
    from sqlalchemy import select

    result = await db.execute(select(Category).where(Category.user_id == user_id))
    categories = result.scalars().all()

    categories_by_type = {
        "income": [c for c in categories if c.type == "income"],
        "expense": [c for c in categories if c.type == "expense"],
        "saving": [c for c in categories if c.type == "saving"],
        "investment": [c for c in categories if c.type == "investment"],
    }

    # Generate transactions for the past 6 months
    start_date = date.today() - timedelta(days=180)
    current_date = start_date

    transactions = []

    while current_date <= date.today():
        # Monthly salary (1st of each month)
        if current_date.day == 1:
            salary_amount = Decimal(str(random.uniform(4000, 6000)))
            salary_category = random.choice(categories_by_type["income"])
            period = await budget_service.get_or_create_period_for_date(user_id, current_date)

            transaction = Transaction(
                user_id=user_id,
                budget_period_id=period.id,
                category_id=salary_category.id,
                amount=salary_amount,
                description="Monthly Salary",
                transacted_at=current_date,
                type="income",
                payment_method="bank_transfer",
            )
            transactions.append(transaction)

        # Random daily expenses (70% chance)
        if random.random() < 0.7:
            expense_amount = Decimal(str(random.uniform(10, 200)))
            expense_category = random.choice(categories_by_type["expense"])
            period = await budget_service.get_or_create_period_for_date(user_id, current_date)

            transaction = Transaction(
                user_id=user_id,
                budget_period_id=period.id,
                category_id=expense_category.id,
                amount=expense_amount,
                description=f"Expense - {expense_category.name}",
                transacted_at=current_date,
                type="expense",
                payment_method=random.choice(["card", "cash", "digital_wallet"]),
            )
            transactions.append(transaction)

        # Monthly savings (15th of each month)
        if current_date.day == 15:
            savings_amount = Decimal(str(random.uniform(500, 1000)))
            savings_category = random.choice(categories_by_type["saving"])
            period = await budget_service.get_or_create_period_for_date(user_id, current_date)

            transaction = Transaction(
                user_id=user_id,
                budget_period_id=period.id,
                category_id=savings_category.id,
                amount=savings_amount,
                description="Monthly Savings",
                transacted_at=current_date,
                type="saving",
                payment_method="bank_transfer",
            )
            transactions.append(transaction)

        # Investment (monthly, random day)
        if random.random() < 0.3:  # 30% chance per day, effectively monthly
            investment_amount = Decimal(str(random.uniform(200, 800)))
            investment_category = random.choice(categories_by_type["investment"])
            period = await budget_service.get_or_create_period_for_date(user_id, current_date)

            transaction = Transaction(
                user_id=user_id,
                budget_period_id=period.id,
                category_id=investment_category.id,
                amount=investment_amount,
                description=f"Investment - {investment_category.name}",
                transacted_at=current_date,
                type="investment",
                payment_method="bank_transfer",
            )
            transactions.append(transaction)

        current_date += timedelta(days=1)

    db.add_all(transactions)
    await db.commit()

    # Recalculate all period totals
    result = await db.execute(select(BudgetPeriod.id).where(BudgetPeriod.user_id == user_id))
    period_ids = result.scalars().all()

    for period_id in period_ids:
        await budget_service.recalculate_period_totals(period_id)

    print(f"Created {len(transactions)} sample transactions")


async def create_sample_goals(user_id):
    """Create sample financial goals"""
    async with AsyncSessionLocal() as db:
        goals = [
            FinancialGoal(
                user_id=user_id,
                name="Emergency Fund",
                target_amount=Decimal("10000"),
                current_amount=Decimal("3500"),
                target_date=date.today() + timedelta(days=365),
                category="emergency_fund",
            ),
            FinancialGoal(
                user_id=user_id,
                name="Vacation to Europe",
                target_amount=Decimal("5000"),
                current_amount=Decimal("1200"),
                target_date=date.today() + timedelta(days=200),
                category="vacation",
            ),
            FinancialGoal(
                user_id=user_id,
                name="House Down Payment",
                target_amount=Decimal("50000"),
                current_amount=Decimal("12000"),
                target_date=date.today() + timedelta(days=1095),  # 3 years
                category="house",
            ),
        ]

        db.add_all(goals)
        await db.commit()
        print(f"Created {len(goals)} sample financial goals")


async def main():
    """Initialize database with sample data"""
    print("Creating sample user...")
    user = await create_sample_user()

    print("Creating default categories...")
    await create_default_categories()

    print("Creating sample transactions...")
    async with AsyncSessionLocal() as db:
        await create_sample_transactions(user.id, db)

    print("Creating sample financial goals...")
    await create_sample_goals(user.id)

    print("Sample data creation completed!")


if __name__ == "__main__":
    asyncio.run(main())
