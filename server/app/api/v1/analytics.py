from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ApiResponse, CategoryBreakdown, DashboardSummary, MonthlyTrend, YearlySummary
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/dashboard", response_model=ApiResponse[DashboardSummary])
async def get_dashboard_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get dashboard summary with current period overview"""
    service = AnalyticsService(db)
    summary = await service.get_dashboard_summary(current_user.id)
    return ApiResponse(result=summary)


@router.get("/yearly/{year}", response_model=ApiResponse[YearlySummary])
async def get_yearly_summary(
    year: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get yearly financial summary"""
    service = AnalyticsService(db)
    summary = await service.get_yearly_summary(current_user.id, year)
    return ApiResponse(result=summary)


@router.get("/trends", response_model=ApiResponse[List[MonthlyTrend]])
async def get_spending_trends(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get spending trends over time"""
    service = AnalyticsService(db)
    trends = await service.get_spending_trends(current_user.id, months)
    return ApiResponse(result=trends)


@router.get("/categories", response_model=ApiResponse[List[CategoryBreakdown]])
async def get_category_breakdown(
    period_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get category breakdown for a specific period or current period"""
    service = AnalyticsService(db)
    breakdown = await service.get_category_breakdown(current_user.id, period_id)
    return ApiResponse(result=breakdown)
