"""Creator sosyal hesap bağlama uçları (OAuth)."""

from datetime import timedelta

from django.core import signing
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.exceptions import error_response
from apps.accounts.permissions import IsCreator

from ..models import SocialAccount
from . import crypto
from .providers import SocialError, SocialNotConfigured, get_provider
from .sync import apply_profile, update_creator_badge

STATE_SALT = "trugc.social.oauth"
STATE_MAX_AGE = 600  # 10 dk


def make_state(user, platform: str) -> str:
    return signing.dumps({"u": user.pk, "p": platform}, salt=STATE_SALT)


def read_state(state: str, user, platform: str) -> None:
    """CSRF koruması: state imzalı, süreli ve istek sahibine/platforma bağlı olmalı."""
    try:
        data = signing.loads(state, salt=STATE_SALT, max_age=STATE_MAX_AGE)
    except signing.BadSignature as exc:
        raise SocialError("Bağlantı oturumu geçersiz veya süresi dolmuş. Tekrar deneyin.") from exc
    if data.get("u") != user.pk or data.get("p") != platform:
        raise SocialError("Bağlantı oturumu bu hesaba ait değil.")


class SocialConnectView(APIView):
    """GET → platformun yetkilendirme adresini döner (kullanıcı oraya yönlendirilir)."""

    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def get(self, request, platform):
        try:
            provider = get_provider(platform)
            url = provider.authorize_url(make_state(request.user, platform))
        except SocialNotConfigured as exc:
            return error_response("SOCIAL_NOT_CONFIGURED", str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except SocialError as exc:
            return error_response("SOCIAL_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)
        return Response({"authorize_url": url})


class SocialCallbackView(APIView):
    """POST {code, state} → kodu token'a çevirir, profili okur, hesabı doğrulanmış olarak bağlar."""

    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def post(self, request, platform):
        code = str(request.data.get("code", ""))
        state = str(request.data.get("state", ""))
        if not code or not state:
            return error_response("VALIDATION_ERROR", "Eksik yetkilendirme bilgisi.", status.HTTP_400_BAD_REQUEST)
        try:
            read_state(state, request.user, platform)
            provider = get_provider(platform)
            tokens = provider.exchange_code(code)
            profile = provider.fetch_profile(tokens.access_token)
        except SocialNotConfigured as exc:
            return error_response("SOCIAL_NOT_CONFIGURED", str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except SocialError as exc:
            return error_response("SOCIAL_ERROR", str(exc), status.HTTP_400_BAD_REQUEST)

        creator = request.user.creator
        # Aynı platform hesabı başka bir creator'a bağlıysa reddedilir (sahte/çoklu profil engeli).
        clash = (
            SocialAccount.objects.filter(platform=platform, provider_user_id=profile.provider_user_id)
            .exclude(creator=creator)
            .exists()
        )
        if clash:
            return error_response(
                "SOCIAL_ALREADY_LINKED", "Bu hesap başka bir TRUGC profiline bağlı.", status.HTTP_409_CONFLICT
            )
        account, _ = SocialAccount.objects.get_or_create(
            creator=creator, platform=platform, handle=profile.handle
        )
        # Aynı platformda eski bir hesap varsa tek hesapla sınırlı kalır (güncellenir).
        account.access_token_enc = crypto.encrypt(tokens.access_token)
        account.refresh_token_enc = crypto.encrypt(tokens.refresh_token)
        account.token_expires_at = timezone.now() + timedelta(seconds=tokens.expires_in) if tokens.expires_in else None
        apply_profile(account, profile, first_connect=True)
        return Response(
            {
                "platform": account.platform,
                "handle": account.handle,
                "followers_count": account.followers_count,
                "is_verified": account.is_verified,
            },
            status=status.HTTP_201_CREATED,
        )


class SocialDisconnectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCreator]

    def delete(self, request, platform):
        creator = request.user.creator
        deleted, _ = SocialAccount.objects.filter(creator=creator, platform=platform).delete()
        update_creator_badge(creator)
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)
