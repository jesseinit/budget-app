from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import DashboardSummary, YearlySummary
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get dashboard summary with current period overview"""
    service = AnalyticsService(db)
    return await service.get_dashboard_summary(current_user.id)


@router.get("/yearly/{year}", response_model=YearlySummary)
async def get_yearly_summary(
    year: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get yearly financial summary"""
    service = AnalyticsService(db)
    return await service.get_yearly_summary(current_user.id, year)


@router.get("/trends")
async def get_spending_trends(
    months: int = Query(12, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get spending trends over time"""
    service = AnalyticsService(db)
    return await service.get_spending_trends(current_user.id, months)


@router.get("/categories")
async def get_category_breakdown(
    period_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get category breakdown for a specific period or current period"""
    service = AnalyticsService(db)
    return await service.get_category_breakdown(current_user.id, period_id)
