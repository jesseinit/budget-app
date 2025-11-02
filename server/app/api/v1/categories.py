from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user_models import User
from app.schemas import ApiResponse, MessageResponse
from app.schemas.category_schemas import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[CategoryResponse]])
async def get_categories(
    category_type: Optional[str] = Query(None, description="Filter by type: income, expense, saving, investment"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's categories"""
    service = CategoryService(db)
    categories = await service.get_categories(current_user.id, category_type)
    return ApiResponse(result=categories)


@router.post("/", response_model=ApiResponse[CategoryResponse], status_code=status.HTTP_201_CREATED)
async def create_category(
    category: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new category"""
    service = CategoryService(db)
    new_category = await service.create_category(current_user.id, category)
    return ApiResponse(result=new_category)


@router.get("/{category_id}", response_model=ApiResponse[CategoryResponse])
async def get_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific category"""
    service = CategoryService(db)
    category = await service.get_category(category_id, current_user.id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return ApiResponse(result=category)


@router.put("/{category_id}", response_model=ApiResponse[CategoryResponse])
async def update_category(
    category_id: UUID,
    category_update: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a category"""
    service = CategoryService(db)
    updated_category = await service.update_category(category_id, current_user.id, category_update)
    if not updated_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return ApiResponse(result=updated_category)


@router.delete("/{category_id}", response_model=ApiResponse[MessageResponse])
async def delete_category(
    category_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a category"""
    service = CategoryService(db)
    success = await service.delete_category(category_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return ApiResponse(
        result=MessageResponse(
            message="Category deleted successfully",
            details={"category_id": str(category_id)}
        )
    )
