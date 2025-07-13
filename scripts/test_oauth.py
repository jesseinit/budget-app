"""Test OAuth flow manually"""

import asyncio
import webbrowser
from app.services.auth_service import AuthService


async def test_oauth_flow():
    """Test OAuth flow manually"""
    auth_service = AuthService()

    print("Testing Google OAuth...")
    google_url = auth_service.get_google_auth_url()
    print(f"Google OAuth URL: {google_url}")

    print("\nTesting GitHub OAuth...")
    github_url = auth_service.get_github_auth_url()
    print(f"GitHub OAuth URL: {github_url}")

    # Optionally open URLs in browser
    choice = input("\nOpen URLs in browser? (y/n): ")
    if choice.lower() == "y":
        webbrowser.open(google_url)
        webbrowser.open(github_url)


if __name__ == "__main__":
    asyncio.run(test_oauth_flow())
