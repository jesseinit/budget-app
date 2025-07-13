from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_categories(self, user_id: UUID, category_type: Optional[str] = None) -> List[Category]:
        """Get user's categories with optional type filter"""
        query = select(Category).where(Category.user_id == user_id)

        if category_type:
            query = query.where(Category.type == category_type)

        query = query.order_by(Category.name)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_category(self, category_id: UUID, user_id: UUID) -> Optional[Category]:
        """Get a specific category"""
        query = select(Category).where(and_(Category.id == category_id, Category.user_id == user_id))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_category(self, user_id: UUID, category_data: CategoryCreate) -> Category:
        """Create a new category"""
        # Check if category with same name and type already exists
        existing = await self._get_category_by_name_and_type(user_id, category_data.name, category_data.type)
        if existing:
            raise ValueError(f"Category '{category_data.name}' of type '{category_data.type}' already exists")

        category = Category(user_id=user_id, **category_data.dict())

        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)

        return category

    async def update_category(
        self, category_id: UUID, user_id: UUID, update_data: CategoryUpdate
    ) -> Optional[Category]:
        """Update a category"""
        category = await self.get_category(category_id, user_id)
        if not category:
            return None

        # Check for name conflicts if name is being updated
        if update_data.name and update_data.name != category.name:
            existing = await self._get_category_by_name_and_type(user_id, update_data.name, category.type)
            if existing and existing.id != category_id:
                raise ValueError(f"Category '{update_data.name}' of type '{category.type}' already exists")

        # Update fields
        for field, value in update_data.dict(exclude_unset=True).items():
            setattr(category, field, value)

        await self.db.commit()
        await self.db.refresh(category)

        return category

    async def delete_category(self, category_id: UUID, user_id: UUID) -> bool:
        """Delete a category"""
        category = await self.get_category(category_id, user_id)
        if not category:
            return False

        # Check if category is being used by transactions
        from app.models.transaction import Transaction

        query = select(Transaction).where(Transaction.category_id == category_id).limit(1)
        result = await self.db.execute(query)
        if result.scalar_one_or_none():
            raise ValueError("Cannot delete category that is being used by transactions")

        await self.db.delete(category)
        await self.db.commit()

        return True

    async def _get_category_by_name_and_type(self, user_id: UUID, name: str, category_type: str) -> Optional[Category]:
        """Get category by name and type"""
        query = select(Category).where(
            and_(Category.user_id == user_id, Category.name == name, Category.type == category_type)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()
