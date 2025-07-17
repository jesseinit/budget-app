"""Initialize database with sample categories and data"""

from app.database import AsyncSessionLocal
from app.models.category_models import Category
from app.models.user_models import User


async def create_default_categories():
    """Create default categories for all users"""
    default_categories = [
        # Income categories
        {"name": "Salary", "type": "income", "color": "#4CAF50", "icon": "💰", "is_default": True},
        {
            "name": "Freelance",
            "type": "income",
            "color": "#8BC34A",
            "icon": "💼",
            "is_default": True,
        },
        {
            "name": "Investment Returns",
            "type": "income",
            "color": "#CDDC39",
            "icon": "📈",
            "is_default": True,
        },
        {
            "name": "Other Income",
            "type": "income",
            "color": "#FFC107",
            "icon": "💵",
            "is_default": True,
        },
        # Expense categories
        {
            "name": "Food & Dining",
            "type": "expense",
            "color": "#FF5722",
            "icon": "🍽️",
            "is_default": True,
        },
        {
            "name": "Transportation",
            "type": "expense",
            "color": "#FF9800",
            "icon": "🚗",
            "is_default": True,
        },
        {
            "name": "Housing",
            "type": "expense",
            "color": "#795548",
            "icon": "🏠",
            "is_default": True,
        },
        {
            "name": "Utilities",
            "type": "expense",
            "color": "#607D8B",
            "icon": "⚡",
            "is_default": True,
        },
        {
            "name": "Healthcare",
            "type": "expense",
            "color": "#E91E63",
            "icon": "🏥",
            "is_default": True,
        },
        {
            "name": "Entertainment",
            "type": "expense",
            "color": "#9C27B0",
            "icon": "🎬",
            "is_default": True,
        },
        {
            "name": "Shopping",
            "type": "expense",
            "color": "#3F51B5",
            "icon": "🛍️",
            "is_default": True,
        },
        {
            "name": "Education",
            "type": "expense",
            "color": "#2196F3",
            "icon": "📚",
            "is_default": True,
        },
        {
            "name": "Personal Care",
            "type": "expense",
            "color": "#00BCD4",
            "icon": "💅",
            "is_default": True,
        },
        {
            "name": "Insurance",
            "type": "expense",
            "color": "#009688",
            "icon": "🛡️",
            "is_default": True,
        },
        {"name": "Taxes", "type": "expense", "color": "#4CAF50", "icon": "📋", "is_default": True},
        {
            "name": "Miscellaneous",
            "type": "expense",
            "color": "#9E9E9E",
            "icon": "📦",
            "is_default": True,
        },
        # Savings categories
        {
            "name": "Emergency Fund",
            "type": "saving",
            "color": "#FF5722",
            "icon": "🆘",
            "is_default": True,
        },
        {
            "name": "Vacation Fund",
            "type": "saving",
            "color": "#FF9800",
            "icon": "✈️",
            "is_default": True,
        },
        {
            "name": "House Down Payment",
            "type": "saving",
            "color": "#795548",
            "icon": "🏡",
            "is_default": True,
        },
        {
            "name": "General Savings",
            "type": "saving",
            "color": "#4CAF50",
            "icon": "💰",
            "is_default": True,
        },
        # Investment categories
        {
            "name": "Stocks",
            "type": "investment",
            "color": "#2196F3",
            "icon": "📊",
            "is_default": True,
        },
        {
            "name": "Bonds",
            "type": "investment",
            "color": "#3F51B5",
            "icon": "📋",
            "is_default": True,
        },
        {
            "name": "Mutual Funds",
            "type": "investment",
            "color": "#9C27B0",
            "icon": "📈",
            "is_default": True,
        },
        {
            "name": "Real Estate",
            "type": "investment",
            "color": "#795548",
            "icon": "🏘️",
            "is_default": True,
        },
        {
            "name": "Cryptocurrency",
            "type": "investment",
            "color": "#FF9800",
            "icon": "₿",
            "is_default": True,
        },
        {
            "name": "Retirement (401k/IRA)",
            "type": "investment",
            "color": "#607D8B",
            "icon": "🏦",
            "is_default": True,
        },
    ]

    async with AsyncSessionLocal() as db:
        # Get all users
        from sqlalchemy import select

        result = await db.execute(select(User))
        users = result.scalars().all()

        for user in users:
            for cat_data in default_categories:
                # Check if category already exists
                existing = await db.execute(
                    select(Category).where(
                        Category.user_id == user.id,
                        Category.name == cat_data["name"],
                        Category.type == cat_data["type"],
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                category = Category(user_id=user.id, **cat_data)
                db.add(category)

        await db.commit()
        print(f"Created default categories for {len(users)} users")
