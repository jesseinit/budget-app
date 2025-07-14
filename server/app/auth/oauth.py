from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

from app.config import settings

config = Config()
oauth = OAuth(config)

# Register OAuth providers
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid_configuration",
    client_kwargs={"scope": "openid email profile"},
)
