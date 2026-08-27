import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# Django'nun ASGI uygulaması, model'lere dokunan herhangi bir şeyi
# (routing -> consumers -> models) import etmeden önce oluşturulmalıdır;
# aksi halde Django "Apps aren't loaded yet" hatası verir.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.accounts.ws_auth import JWTAuthMiddleware  # noqa: E402
from apps.messaging.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        # JWTAuthMiddleware, scope["user"]'ı ?token=<access token> üzerinden
        # çözümler (REST API'nin kullandığı aynı SimpleJWT access token'ı) —
        # origin/host kontrolü zaten uçta Caddy tarafından yalnızca yapılandırılan
        # $DOMAIN'i proxy'lemesiyle sağlanıyor, bu yüzden burada ekstra bir
        # AllowedOriginValidator katmanına gerek yok.
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
