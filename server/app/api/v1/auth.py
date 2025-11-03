from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ApiResponse, MessageResponse
from app.schemas.auth_schemas import Token
from app.schemas.user_schemas import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("/google", response_model=ApiResponse[dict])
async def google_auth():
    """Get Google OAuth URL"""
    auth_service = AuthService()
    return ApiResponse(result={"auth_url": auth_service.get_google_auth_url()})


@router.get("/google/callback", response_model=ApiResponse[Token])
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: Optional[str] = Query(None, description="State parameter for CSRF protection"),
    error: Optional[str] = Query(None, description="Error parameter if authorization failed"),
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback (GET request)"""

    # Check for OAuth errors
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"OAuth error: {error}")

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authorization code is required")

    auth_service = AuthService(db)
    try:
        token = await auth_service.handle_google_callback(code)
        return ApiResponse(result=token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Authentication failed: {str(e)}")


@router.post("/refresh", response_model=ApiResponse[Token])
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    auth_service = AuthService(db)
    try:
        token = await auth_service.refresh_access_token(refresh_token)
        return ApiResponse(result=token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/logout", response_model=ApiResponse[MessageResponse])
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Logout user"""
    # In a real implementation, you might want to blacklist the token
    return ApiResponse(
        result=MessageResponse(message="Successfully logged out", details={"user_id": str(current_user.id)})
    )


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return ApiResponse(result=current_user)
