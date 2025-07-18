import redis.asyncio as redis
import json
import httpx
from typing import Optional
from app.config import settings


class RedisService:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
            self.client = redis.from_url(settings.REDIS_URL, decode_responses=True)

    async def get(self, key: str):
        if not self.client:
            return None
        try:
            data = await self.client.get(key)
            return json.loads(data) if data else None
        except (redis.RedisError, json.JSONDecodeError):
            return None

    async def setex(self, key: str, seconds: int, value):
        if not self.client:
            return
        try:
            await self.client.setex(key, seconds, json.dumps(value, default=str))
        except redis.RedisError:
            pass  # Fail silently for cache writes

    async def close(self):
        if self.client:
            await self.client.aclose()


# Initialize globally or inject as dependency
redis_service = RedisService()
