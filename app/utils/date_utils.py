from datetime import date, datetime, timedelta, timezone
from typing import Tuple

from dateutil.relativedelta import relativedelta


def calculate_salary_period(salary_day: int, reference_date: datetime = None) -> Tuple[datetime, datetime]:
    """Calculate budget period start and end dates based on salary day"""
    if reference_date is None:
        reference_date = date.today()

    # Find the next salary date (salary_day of next month)
    next_month_salary = (reference_date + relativedelta(months=1)).replace(day=salary_day)

    # The current period started from the previous salary date
    current_period_start = next_month_salary - relativedelta(months=1)

    # Period runs from previous salary day to next salary day
    start_date = current_period_start
    end_date = next_month_salary.replace(tzinfo=timezone.utc)

    return start_date, end_date


def get_financial_year_dates(year: int) -> Tuple[date, date]:
    """Get financial year start and end dates"""
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    return start_date, end_date


def get_month_date_range(year: int, month: int) -> Tuple[date, date]:
    """Get first and last day of a month"""
    start_date = date(year, month, 1)
    end_date = start_date + relativedelta(months=1) - timedelta(days=1)
    return start_date, end_date
