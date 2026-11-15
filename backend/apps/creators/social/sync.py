"""Bağlı hesapları periyodik güncelleme + sahte profil kontrolü."""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from apps.accounts.models import log_admin_action  # noqa: F401  (admin işaretleme için ileride)
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from ..models import SocialAccount
from . import crypto
from .providers import Profile, SocialError, get_provider

logger = logging.getLogger(__name__)


def suspicion_reasons(account: SocialAccount, profile: Profile, previous_followers: int) -> list[str]:
    """Şüpheli veri sinyalleri. Kesin hüküm değildir, admin'e inceleme için işaret düşer."""
    reasons = []
    eng = profile.engagement_rate
    if eng is not None and Decimal(str(eng)) > Decimal(str(settings.SOCIAL_SUSPICIOUS_ENGAGEMENT_PERCENT)):
        reasons.append(f"Olağan dışı yüksek etkileşim oranı (%{eng})")
    jump = Decimal(str(settings.SOCIAL_SUSPICIOUS_FOLLOWER_JUMP_PERCENT))
    if previous_followers >= 100 and profile.followers > previous_followers * (1 + jump / 100):
        reasons.append(f"Takipçi sayısı kısa sürede {previous_followers} → {profile.followers} sıçradı")
    if profile.followers and profile.followers < 50 and account.is_verified:
        reasons.append("Çok düşük takipçi sayısı")
    return reasons


def apply_profile(account: SocialAccount, profile: Profile, *, first_connect: bool = False) -> SocialAccount:
    previous = account.followers_count
    account.provider_user_id = profile.provider_user_id
    account.handle = profile.handle
    if profile.profile_url:
        account.profile_url = profile.profile_url
    account.followers_count = profile.followers
    account.reach_count = profile.reach
    if profile.engagement_rate is not None:
        account.engagement_rate = Decimal(str(min(profile.engagement_rate, 999)))
    account.last_synced_at = timezone.now()
    # OAuth ile sahiplik kanıtlandığı için hesap doğrulanmış sayılır.
    account.is_verified = True
    reasons = [] if first_connect else suspicion_reasons(account, profile, previous)
    account.is_suspicious = bool(reasons)
    account.flag_reason = "; ".join(reasons)[:255]
    account.save()
    update_creator_badge(account.creator)
    if account.is_suspicious:
        _notify_admins(account)
    return account


def update_creator_badge(creator) -> None:
    """Mavi tik: en az bir OAuth ile doğrulanmış ve şüpheli işaretsiz hesap."""
    accounts = list(creator.social_accounts.exclude(provider_user_id=""))
    eligible = bool(accounts) and not any(a.is_suspicious for a in accounts)
    if creator.is_verified != eligible and (eligible or creator.social_accounts.filter(is_suspicious=True).exists()):
        creator.is_verified = eligible
        creator.save(update_fields=["is_verified", "updated_at"])


def _notify_admins(account: SocialAccount) -> None:
    from django.contrib.auth import get_user_model

    for admin in get_user_model().objects.filter(role__in=["admin", "moderator"], is_active=True)[:20]:
        notify_user(
            user=admin,
            title="Şüpheli creator profili",
            body=f"@{account.handle} ({account.platform}): {account.flag_reason}",
            notification_type=NotificationType.SYSTEM,
            link="/manage/creators",
        )


def sync_account(account: SocialAccount) -> bool:
    """Tek hesabı günceller. Token süresi dolmuşsa yeniler; başarısızsa False döner."""
    provider = get_provider(account.platform)
    access = crypto.decrypt(account.access_token_enc)
    try:
        if account.token_expires_at and account.token_expires_at - timedelta(days=1) <= timezone.now():
            refresh_token = crypto.decrypt(account.refresh_token_enc) or access
            tokens = provider.refresh(refresh_token)
            access = tokens.access_token
            account.access_token_enc = crypto.encrypt(access)
            if tokens.refresh_token:
                account.refresh_token_enc = crypto.encrypt(tokens.refresh_token)
            account.token_expires_at = timezone.now() + timedelta(seconds=tokens.expires_in) if tokens.expires_in else None
        apply_profile(account, provider.fetch_profile(access))
        return True
    except SocialError as exc:
        logger.warning("Sosyal hesap güncellenemedi (%s #%s): %s", account.platform, account.pk, exc)
        return False


def refresh_all() -> dict:
    ok = failed = 0
    for account in SocialAccount.objects.exclude(access_token_enc="").select_related("creator"):
        if sync_account(account):
            ok += 1
        else:
            failed += 1
    return {"ok": ok, "failed": failed}
