import pytest
from httpx import AsyncClient

from app.main import app
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_google_auth_url():
    """Test Google OAuth URL generation"""
    auth_service = AuthService()
    url = auth_service.get_google_auth_url()

    assert "accounts.google.com/o/oauth2/auth" in url
    assert "client_id=" in url
    assert "scope=openid+email+profile" in url


@pytest.mark.asyncio
async def test_github_auth_url():
    """Test GitHub OAuth URL generation"""
    auth_service = AuthService()
    url = auth_service.get_github_auth_url()

    assert "github.com/login/oauth/authorize" in url
    assert "client_id=" in url
    assert "scope=user%3Aemail" in url


@pytest.mark.asyncio
async def test_auth_endpoints():
    """Test authentication endpoints"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Test Google auth URL endpoint
        response = await client.get("/auth/google")
        assert response.status_code == 200
        assert "auth_url" in response.json()

        # Test GitHub auth URL endpoint
        response = await client.get("/auth/github")
        assert response.status_code == 200
        assert "auth_url" in response.json()


@pytest.mark.asyncio
async def test_token_creation():
    """Test JWT token creation"""
    from app.models.user_models import User

    user = User(
        id="test-id",
        email="test@example.com",
        name="Test User",
        oauth_provider="google",
        oauth_id="123",
    )

    auth_service = AuthService()
    tokens = auth_service._create_tokens(user)

    assert tokens.access_token
    assert tokens.refresh_token
    assert tokens.token_type == "bearer"
