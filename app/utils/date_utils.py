from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from typing import Tuple


def calculate_salary_period(salary_day: int, reference_date: date = None) -> Tuple[date, date]:
    """Calculate budget period start and end dates based on salary day"""
    if reference_date is None:
        reference_date = date.today()

    # Find the most recent salary date
    current_month_salary = reference_date.replace(day=salary_day)

    if reference_date >= current_month_salary:
        # We're in or past the current salary period
        start_date = current_month_salary
        end_date = (current_month_salary + relativedelta(months=1)) - timedelta(days=1)
    else:
        # We're before this month's salary date
        start_date = current_month_salary - relativedelta(months=1)
        end_date = current_month_salary - timedelta(days=1)

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
