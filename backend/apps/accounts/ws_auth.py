"""JWT authentication for Channels WebSocket connections.

Channels consumers don't go through DRF's authentication classes — the
handshake is a plain ASGI `scope`, not a DRF `Request`. This middleware reads
the same access token the REST API uses (`Authorization: Bearer <token>`),
passed as a `?token=` query param since browsers can't set custom headers on
a WebSocket handshake, validates it with SimpleJWT, and attaches the
resolved user to `scope["user"]` — anonymous (and rejected by the consumer)
if the token is missing, expired, or invalid.
"""
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
