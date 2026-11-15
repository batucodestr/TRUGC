"""Resmî OAuth/API sağlayıcıları: Instagram, TikTok, YouTube.

Sosyal medya **şifresi hiçbir zaman istenmez**; yalnızca kullanıcının platformun
kendi izin ekranında verdiği OAuth izni kullanılır. İstemci kimlik bilgileri
ortam değişkenlerinden okunur (bkz. .env.example).

Her platformun uç noktaları/izinleri resmî dokümana göredir; canlıya almadan
önce ilgili geliştirici konsolunda uygulamanın gerekli izinler için inceleme
(app review) onayı alması gerekir (özellikle Instagram ve TikTok).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

from django.conf import settings

TIMEOUT = 15


class SocialError(Exception):
    pass


class SocialNotConfigured(SocialError):
    pass


@dataclass
class Tokens:
    access_token: str
    refresh_token: str = ""
    expires_in: int | None = None


@dataclass
class Profile:
    provider_user_id: str
    handle: str
    profile_url: str = ""
    followers: int = 0
    reach: int = 0
    engagement_rate: float | None = None
    raw: dict = field(default_factory=dict)


def _request(url: str, *, data: dict | None = None, headers: dict | None = None) -> dict:
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310 - sabit https uç noktaları
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")[:200]
        raise SocialError(f"Platform isteği başarısız ({exc.code}): {detail}") from exc
    except (urllib.error.URLError, ValueError, TimeoutError) as exc:
        raise SocialError(f"Platforma ulaşılamadı: {exc}") from exc


class Provider:
    platform = ""
    required_settings: tuple[str, ...] = ()

    def ensure_configured(self):
        missing = [k for k in self.required_settings if not getattr(settings, k, "")]
        if missing:
            raise SocialNotConfigured("OAuth yapılandırılmadı. Eksik ayarlar: " + ", ".join(missing))

    def redirect_uri(self) -> str:
        return f"{settings.SOCIAL_OAUTH_REDIRECT_BASE}/oauth/{self.platform}/callback"

    def authorize_url(self, state: str) -> str:
        raise NotImplementedError

    def exchange_code(self, code: str) -> Tokens:
        raise NotImplementedError

    def fetch_profile(self, access_token: str) -> Profile:
        raise NotImplementedError

    def refresh(self, refresh_token: str) -> Tokens:  # token yenilemeyi desteklemeyen platformlarda hata
        raise SocialError("Bu platform için token yenileme desteklenmiyor.")


class InstagramProvider(Provider):
    """Instagram API with Instagram Login (profesyonel/creator hesaplar)."""

    platform = "instagram"
    required_settings = ("INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET")

    def authorize_url(self, state):
        self.ensure_configured()
        q = {
            "client_id": settings.INSTAGRAM_CLIENT_ID,
            "redirect_uri": self.redirect_uri(),
            "response_type": "code",
            "scope": "instagram_business_basic",
            "state": state,
        }
        return "https://www.instagram.com/oauth/authorize?" + urllib.parse.urlencode(q)

    def exchange_code(self, code):
        self.ensure_configured()
        short = _request(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": settings.INSTAGRAM_CLIENT_ID,
                "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": self.redirect_uri(),
                "code": code,
            },
        )
        token = short.get("access_token")
        if not token:
            raise SocialError("Instagram erişim anahtarı alınamadı.")
        # Kısa ömürlü token → uzun ömürlü (60 gün) token.
        q = urllib.parse.urlencode(
            {"grant_type": "ig_exchange_token", "client_secret": settings.INSTAGRAM_CLIENT_SECRET, "access_token": token}
        )
        long = _request("https://graph.instagram.com/access_token?" + q)
        return Tokens(long.get("access_token", token), expires_in=long.get("expires_in"))

    def refresh(self, refresh_token):
        q = urllib.parse.urlencode({"grant_type": "ig_refresh_token", "access_token": refresh_token})
        data = _request("https://graph.instagram.com/refresh_access_token?" + q)
        return Tokens(data["access_token"], expires_in=data.get("expires_in"))

    def fetch_profile(self, access_token):
        q = urllib.parse.urlencode(
            {"fields": "user_id,username,followers_count,media_count,account_type", "access_token": access_token}
        )
        me = _request("https://graph.instagram.com/me?" + q)
        if not me.get("username"):
            raise SocialError("Instagram profili okunamadı.")
        followers = int(me.get("followers_count") or 0)
        reach, engagement = 0, None
        try:
            mq = urllib.parse.urlencode({"fields": "like_count,comments_count", "limit": 12, "access_token": access_token})
            media = _request("https://graph.instagram.com/me/media?" + mq).get("data", [])
            interactions = [int(m.get("like_count") or 0) + int(m.get("comments_count") or 0) for m in media]
            reach = sum(interactions)
            if interactions and followers:
                engagement = round(sum(interactions) / len(interactions) / followers * 100, 2)
        except SocialError:
            pass  # istatistik alınamasa da profil doğrulaması geçerlidir
        return Profile(
            provider_user_id=str(me.get("user_id") or me.get("id")),
            handle=me["username"],
            profile_url=f"https://www.instagram.com/{me['username']}/",
            followers=followers,
            reach=reach,
            engagement_rate=engagement,
            raw=me,
        )


class TikTokProvider(Provider):
    platform = "tiktok"
    required_settings = ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET")

    def authorize_url(self, state):
        self.ensure_configured()
        q = {
            "client_key": settings.TIKTOK_CLIENT_KEY,
            "scope": "user.info.basic,user.info.profile,user.info.stats",
            "response_type": "code",
            "redirect_uri": self.redirect_uri(),
            "state": state,
        }
        return "https://www.tiktok.com/v2/auth/authorize/?" + urllib.parse.urlencode(q)

    def _token(self, data):
        res = _request(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data={"client_key": settings.TIKTOK_CLIENT_KEY, "client_secret": settings.TIKTOK_CLIENT_SECRET, **data},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if not res.get("access_token"):
            raise SocialError("TikTok erişim anahtarı alınamadı.")
        return Tokens(res["access_token"], res.get("refresh_token", ""), res.get("expires_in"))

    def exchange_code(self, code):
        self.ensure_configured()
        return self._token(
            {"code": code, "grant_type": "authorization_code", "redirect_uri": self.redirect_uri()}
        )

    def refresh(self, refresh_token):
        return self._token({"grant_type": "refresh_token", "refresh_token": refresh_token})

    def fetch_profile(self, access_token):
        fields = "open_id,display_name,username,profile_deep_link,follower_count,likes_count,video_count"
        res = _request(
            "https://open.tiktokapis.com/v2/user/info/?fields=" + fields,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user = (res.get("data") or {}).get("user") or {}
        if not user.get("open_id"):
            raise SocialError("TikTok profili okunamadı.")
        handle = user.get("username") or user.get("display_name") or user["open_id"]
        return Profile(
            provider_user_id=user["open_id"],
            handle=handle,
            profile_url=user.get("profile_deep_link") or "",
            followers=int(user.get("follower_count") or 0),
            reach=int(user.get("likes_count") or 0),
            raw=user,
        )


class YouTubeProvider(Provider):
    platform = "youtube"
    required_settings = ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")

    def authorize_url(self, state):
        self.ensure_configured()
        q = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": self.redirect_uri(),
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.readonly",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(q)

    def exchange_code(self, code):
        self.ensure_configured()
        res = _request(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": self.redirect_uri(),
                "grant_type": "authorization_code",
            },
        )
        if not res.get("access_token"):
            raise SocialError("Google erişim anahtarı alınamadı.")
        return Tokens(res["access_token"], res.get("refresh_token", ""), res.get("expires_in"))

    def refresh(self, refresh_token):
        res = _request(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        return Tokens(res["access_token"], refresh_token, res.get("expires_in"))

    def fetch_profile(self, access_token):
        res = _request(
            "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        items = res.get("items") or []
        if not items:
            raise SocialError("Bu Google hesabında YouTube kanalı bulunamadı.")
        channel = items[0]
        stats = channel.get("statistics", {})
        snippet = channel.get("snippet", {})
        subs = int(stats.get("subscriberCount") or 0)
        views = int(stats.get("viewCount") or 0)
        videos = int(stats.get("videoCount") or 0)
        # Yaklaşık etkileşim: video başına ortalama izlenme / abone (%).
        engagement = round(views / videos / subs * 100, 2) if subs and videos else None
        handle = snippet.get("customUrl") or snippet.get("title") or channel["id"]
        return Profile(
            provider_user_id=channel["id"],
            handle=handle,
            profile_url=f"https://www.youtube.com/channel/{channel['id']}",
            followers=subs,
            reach=views,
            engagement_rate=engagement,
            raw={"id": channel["id"], "title": snippet.get("title")},
        )


PROVIDERS: dict[str, type[Provider]] = {
    "instagram": InstagramProvider,
    "tiktok": TikTokProvider,
    "youtube": YouTubeProvider,
}


def get_provider(platform: str) -> Provider:
    cls = PROVIDERS.get(platform)
    if cls is None:
        raise SocialError("Desteklenmeyen platform.")
    return cls()
