"""
Standard API Response Schemas

All API responses should follow this consistent structure:
{
    "result": {...},  # The actual response data
    "meta": {...}     # Metadata like pagination, timestamps, etc.
}
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from datetime import datetime
from pydantic import BaseModel, Field

# Generic type for response data
T = TypeVar("T")


class PaginationMeta(BaseModel):
    """Pagination metadata"""

    page: int = Field(..., description="Current page number (1-indexed)")
    limit: int = Field(..., description="Number of items per page")
    total: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")

    @classmethod
    def create(cls, page: int, limit: int, total: int) -> "PaginationMeta":
        """Create pagination metadata from page, limit, and total count"""
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        return cls(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        )


class ResponseMeta(BaseModel):
    """
    Metadata for API responses.
    Can include pagination, timestamps, or be empty.
    """

    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp (UTC)")
    pagination: Optional[PaginationMeta] = Field(None, description="Pagination info if applicable")
    message: Optional[str] = Field(None, description="Optional message")
    request_id: Optional[str] = Field(None, description="Request tracking ID")

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response wrapper.

    Usage:
        @router.get("/items", response_model=ApiResponse[List[ItemSchema]])
        async def get_items():
            items = await get_items_from_db()
            return ApiResponse(
                result=items,
                meta=ResponseMeta(
                    pagination=PaginationMeta.create(page=1, limit=10, total=100)
                )
            )
    """

    result: T = Field(..., description="The actual response data")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Response metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "result": {"id": 1, "name": "Example"},
                "meta": {
                    "timestamp": "2024-01-01T12:00:00",
                    "pagination": None,
                    "message": None,
                    "request_id": None,
                },
            }
        }


class PaginatedApiResponse(BaseModel, Generic[T]):
    """
    Paginated API response wrapper.

    Usage:
        @router.get("/items", response_model=PaginatedApiResponse[ItemSchema])
        async def get_items(page: int = 1, limit: int = 10):
            items, total = await get_paginated_items(page, limit)
            return PaginatedApiResponse.create(
                items=items,
                page=page,
                limit=limit,
                total=total
            )
    """

    result: List[T] = Field(..., description="List of items")
    meta: ResponseMeta = Field(..., description="Response metadata with pagination")

    @classmethod
    def create(
        cls,
        items: List[T],
        page: int,
        limit: int,
        total: int,
        message: Optional[str] = None,
    ) -> "PaginatedApiResponse[T]":
        """Create a paginated response with auto-generated pagination metadata"""
        return cls(
            result=items,
            meta=ResponseMeta(
                pagination=PaginationMeta.create(page=page, limit=limit, total=total),
                message=message,
            ),
        )


class MessageResponse(BaseModel):
    """
    Simple message response for actions that don't return data.

    Usage:
        @router.delete("/items/{id}")
        async def delete_item(id: int):
            await delete_item_from_db(id)
            return ApiResponse(
                result=MessageResponse(message="Item deleted successfully"),
                meta=ResponseMeta()
            )
    """

    message: str = Field(..., description="Success or info message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")


class ErrorDetail(BaseModel):
    """Error detail structure"""

    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")


class ErrorResponse(BaseModel):
    """
    Standard error response.

    This is automatically used by FastAPI exception handlers.
    """

    error: str = Field(..., description="Error type or title")
    details: Optional[List[ErrorDetail]] = Field(None, description="Detailed error information")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Response metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Validation Error",
                "details": [{"field": "email", "message": "Invalid email format", "code": "invalid_email"}],
                "meta": {"timestamp": "2024-01-01T12:00:00"},
            }
        }
