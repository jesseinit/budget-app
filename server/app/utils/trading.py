import httpx
from typing import Optional
from app.config import settings
from app.utils.redis import redis_service

url = "https://live.trading212.com/api/v0/equity/account/cash"

payload = {}


async def get_trading_212_account_data(user_id: str) -> dict:
    cache_key = f"trading212:account_data:{user_id}"

    # Try cache first
    cached_data = await redis_service.get(cache_key)
    if cached_data:
        return cached_data

    async with httpx.AsyncClient() as client:
        headers = {
            "Accept": "application/json",
            "Authorization": settings.TRADING212_API_KEY,
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            # Cache for 2 minutes
            await redis_service.setex(cache_key, 120, data)
            return data
        else:
            return {}
