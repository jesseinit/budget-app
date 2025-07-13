from datetime import date, datetime

from pydantic import field_validator


def parse_date_string(date_str: str) -> date:
    """Parse date string in dd-mm-yyyy format"""

    if isinstance(date_str, date):
        return date_str

    if isinstance(date_str, str):
        # Try dd-mm-yyyy format first
        try:
            return datetime.strptime(date_str, "%d-%m-%Y").date()
        except ValueError:
            pass

        # Try ISO format as fallback (yyyy-mm-dd)
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    raise ValueError(f"Date must be in dd-mm-yyyy format, got: {date_str}")


def date_validator(field_name: str):
    """Create a validator for date fields that accepts dd-mm-yyyy format"""

    def validator_func(cls, v):
        if v is None:
            return v
        return parse_date_string(v)

    return field_validator(field_name)(validator_func)
