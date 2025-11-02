from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user_models import User
from app.schemas import (
    ApiResponse,
    PaginatedApiResponse,
    MessageResponse,
    ResponseMeta,
)
from app.schemas.transaction_schemas import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
    TransactionWithCategory,
)
from app.services.transaction_service import TransactionService

router = APIRouter()


@router.get("/", response_model=PaginatedApiResponse[TransactionWithCategory])
async def get_transactions(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    category_id: Optional[UUID] = None,
    transaction_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    period_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user transactions with filters and pagination"""
    service = TransactionService(db)

    # Calculate skip from page
    skip = (page - 1) * limit

    # Get transactions and total count
    transactions = await service.get_transactions(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        category_id=category_id,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
        period_id=period_id,
    )

    # Get total count for pagination
    total = await service.count_transactions(
        user_id=current_user.id,
        category_id=category_id,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date,
        period_id=period_id,
    )

    return PaginatedApiResponse.create(
        items=transactions,
        page=page,
        limit=limit,
        total=total,
    )


@router.post("/", response_model=ApiResponse[TransactionResponse], status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new transaction"""
    service = TransactionService(db)
    new_transaction = await service.create_transaction(current_user.id, transaction)
    return ApiResponse(result=new_transaction)


@router.get("/{transaction_id}", response_model=ApiResponse[TransactionWithCategory])
async def get_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific transaction"""
    service = TransactionService(db)
    transaction = await service.get_transaction(transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return ApiResponse(result=transaction)


@router.put("/{transaction_id}", response_model=ApiResponse[TransactionResponse])
async def update_transaction(
    transaction_id: UUID,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a transaction"""
    service = TransactionService(db)
    updated_transaction = await service.update_transaction(transaction_id, current_user.id, transaction_update)
    if not updated_transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return ApiResponse(result=updated_transaction)


@router.delete("/{transaction_id}", response_model=ApiResponse[MessageResponse])
async def delete_transaction(
    transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a transaction"""
    service = TransactionService(db)
    success = await service.delete_transaction(transaction_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return ApiResponse(
        result=MessageResponse(
            message="Transaction deleted successfully", details={"transaction_id": str(transaction_id)}
        )
    )


@router.post("/bulk", response_model=ApiResponse[List[TransactionResponse]])
async def bulk_create_transactions(
    transactions: List[TransactionCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk create transactions"""
    service = TransactionService(db)
    created_transactions = await service.bulk_create_transactions(current_user.id, transactions)
    return ApiResponse(
        result=created_transactions,
        meta=ResponseMeta(message=f"Successfully created {len(created_transactions)} transactions"),
    )
