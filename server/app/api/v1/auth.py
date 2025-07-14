from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("/google")
async def google_auth():
    """Get Google OAuth URL"""
    auth_service = AuthService()
    return {"auth_url": auth_service.get_google_auth_url()}


@router.get("/google/callback", response_model=Token)
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

    # In production, verify the state parameter here
    # if state != stored_state:
    #     raise HTTPException(status_code=400, detail="Invalid state parameter")

    auth_service = AuthService(db)
    try:
        return await auth_service.handle_google_callback(code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Authentication failed: {str(e)}")


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    auth_service = AuthService(db)
    try:
        return await auth_service.refresh_access_token(refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Logout user"""
    # In a real implementation, you might want to blacklist the token
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
