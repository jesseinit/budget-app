import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import httpx
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.schemas.auth import Token
from app.models.category import Category


class AuthService:
    def __init__(self, db: AsyncSession = None):
        self.db = db

    @staticmethod
    def generate_state() -> str:
        """Generate a secure random state for OAuth"""
        return secrets.token_urlsafe(32)

    def get_google_auth_url(self) -> str:
        """Generate Google OAuth URL"""
        base_url = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "offline",
            "state": self.generate_state(),
            "prompt": "consent",
            "include_granted_scopes": "true",
        }

        return f"{base_url}?{urllib.parse.urlencode(params)}"

    async def handle_google_callback(self, code: str) -> Token:
        """Handle Google OAuth callback and create/login user"""
        # Exchange code for access token
        token_data = await self._exchange_google_code(code)

        # Get user info from Google
        user_info = await self._get_google_user_info(token_data["access_token"])

        # Create or get existing user
        user = await self._create_or_get_user(
            {
                "email": user_info["email"],
                "name": user_info["name"],
                "oauth_provider": "google",
                "oauth_id": user_info["sub"],
                "avatar_url": user_info.get("picture"),
            }
        )

        # Generate JWT tokens
        return self._create_tokens(user)

    async def _exchange_google_code(self, code: str) -> Dict[str, Any]:
        """Exchange Google authorization code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": "http://localhost:9000/auth/google/callback",
                },
            )
            response.raise_for_status()
            return response.json()

    async def _get_google_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Google"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    async def _create_or_get_user(self, user_data: Dict[str, Any]) -> User:
        """Create new user or get existing user"""
        # Check if user exists
        query = select(User).where(
            User.oauth_provider == user_data["oauth_provider"],
            User.oauth_id == user_data["oauth_id"],
        )
        result = await self.db.execute(query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            # Update user info
            existing_user.name = user_data["name"]
            existing_user.email = user_data["email"]
            if user_data.get("avatar_url"):
                existing_user.avatar_url = user_data["avatar_url"]
            existing_user.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing_user)
            return existing_user

        # Create new user
        user = User(**user_data)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        # Create default categories for new user
        await self._create_default_categories_for_user(user.id)

        return user

    async def _create_default_categories_for_user(self, user_id):
        """Create default categories for a new user"""

        default_categories = [
            # Income
            {
                "name": "Salary",
                "type": "income",
                "color": "#4CAF50",
                "icon": "💰",
                "is_default": True,
            },
            {
                "name": "Freelance",
                "type": "income",
                "color": "#8BC34A",
                "icon": "💼",
                "is_default": True,
            },
            # Expenses
            {
                "name": "Food & Dining",
                "type": "expense",
                "color": "#FF5722",
                "icon": "🍽️",
                "is_default": True,
            },
            {
                "name": "Transportation",
                "type": "expense",
                "color": "#FF9800",
                "icon": "🚗",
                "is_default": True,
            },
            {
                "name": "Housing",
                "type": "expense",
                "color": "#795548",
                "icon": "🏠",
                "is_default": True,
            },
            {
                "name": "Utilities",
                "type": "expense",
                "color": "#607D8B",
                "icon": "⚡",
                "is_default": True,
            },
            {
                "name": "Entertainment",
                "type": "expense",
                "color": "#9C27B0",
                "icon": "🎬",
                "is_default": True,
            },
            {
                "name": "Shopping",
                "type": "expense",
                "color": "#3F51B5",
                "icon": "🛍️",
                "is_default": True,
            },
            # Savings
            {
                "name": "Emergency Fund",
                "type": "saving",
                "color": "#FF5722",
                "icon": "🆘",
                "is_default": True,
            },
            {
                "name": "General Savings",
                "type": "saving",
                "color": "#4CAF50",
                "icon": "💰",
                "is_default": True,
            },
            # Investments
            {
                "name": "Stocks",
                "type": "investment",
                "color": "#2196F3",
                "icon": "📊",
                "is_default": True,
            },
        ]

        categories = [Category(user_id=user_id, **cat_data) for cat_data in default_categories]
        self.db.add_all(categories)
        await self.db.commit()

    def _create_tokens(self, user: User) -> Token:
        """Create JWT access and refresh tokens"""
        # Access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token_data = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.name,
            "exp": datetime.now(timezone.utc) + access_token_expires,
        }
        access_token = jwt.encode(access_token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        # Refresh token
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token_data = {
            "sub": str(user.id),
            "type": "refresh",
            "exp": datetime.now(timezone.utc) + refresh_token_expires,
        }
        refresh_token = jwt.encode(refresh_token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

    async def refresh_access_token(self, refresh_token: str) -> Token:
        """Refresh access token using refresh token"""
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

            user_id = payload.get("sub")
            token_type = payload.get("type")

            if not user_id or token_type != "refresh":
                raise JWTError("Invalid refresh token")

            # Get user
            user = await self.db.get(User, user_id)
            if not user:
                raise JWTError("User not found")

            # Create new tokens
            return self._create_tokens(user)

        except JWTError:
            raise Exception("Invalid or expired refresh token")
