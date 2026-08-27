"""Channels WebSocket bağlantıları için JWT kimlik doğrulaması.

Channels consumer'ları DRF'nin kimlik doğrulama sınıflarından geçmez —
handshake, bir DRF `Request`'i değil, düz bir ASGI `scope`'udur. Bu middleware,
REST API'nin kullandığı aynı access token'ı (`Authorization: Bearer <token>`)
okur; tarayıcılar bir WebSocket handshake'inde özel header ayarlayamadığından
bu token `?token=` sorgu parametresi olarak geçirilir, SimpleJWT ile doğrulanır
ve çözümlenen kullanıcı `scope["user"]`'a eklenir — token eksik, süresi dolmuş
veya geçersizse anonim kalır (ve consumer tarafından reddedilir)."""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token: str):
    from .models import User

    try:
        validated = AccessToken(token)
        return User.objects.get(pk=validated["user_id"])
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = parse_qs(scope.get("query_string", b"").decode())
        token = query_string.get("token", [None])[0]
        scope["user"] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
