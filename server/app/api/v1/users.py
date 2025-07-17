from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user_models import User
from app.schemas.user_schemas import UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile"""
    service = UserService(db)
    updated_user = await service.update_user(current_user.id, user_update)

    if not updated_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return updated_user


@router.put("/salary-day")
async def update_salary_day(
    salary_day: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's salary day"""
    if salary_day < 1 or salary_day > 31:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Salary day must be between 1 and 31")

    service = UserService(db)
    try:
        updated_user = await service.update_salary_day(current_user.id, salary_day)
        if not updated_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {"message": "Salary day updated successfully", "salary_day": salary_day}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/stats")
async def get_user_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get user statistics"""
    service = UserService(db)
    stats = await service.get_user_stats(current_user.id)
    return stats


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete user account and all associated data"""
    service = UserService(db)
    success = await service.delete_user(current_user.id)

    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
