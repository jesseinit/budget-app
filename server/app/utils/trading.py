import httpx
from app.config import settings

url = "https://live.trading212.com/api/v0/equity/account/cash"

payload = {}


async def get_trading_212_account_data():
    async with httpx.AsyncClient() as client:
        headers = {
            "Accept": "application/json",
            "Authorization": settings.TRADING212_API_KEY,
        }
        response = await client.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Error fetching data: {response.status_code} - {response.text}")
