import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# Django's ASGI app must be constructed before importing anything that
# touches models (routing -> consumers -> models), or Django raises
# "Apps aren't loaded yet".
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.accounts.ws_auth import JWTAuthMiddleware  # noqa: E402
from apps.messaging.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # JWTAuthMiddleware resolves scope["user"] from ?token=<access token>
        # (the same SimpleJWT access token the REST API uses) — origin/host
        # checking is already handled at the edge by Caddy only proxying the
        # configured $DOMAIN, so no extra AllowedOriginValidator layer here.
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
