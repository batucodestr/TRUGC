"""Bakiye ve üyelik paketi servisleri.

Bakiye ve üyelik **yalnızca buradan** değiştirilir. View'lar ``Wallet.balance``
alanına doğrudan yazmaz; aksi halde defter (WalletEntry) ile bakiye birbirinden
ayrışabilir ve hangi paranın nereden geldiği izlenemez hale gelirdi.

Eşzamanlılık: iki admin aynı anda aynı kullanıcıya yükleme yaparsa, kilit
alınmadan okunan bakiye üzerine yazmak yüklemelerden birini kaybettirirdi
(lost update). Bu yüzden her değişiklik ``select_for_update`` ile satırı
kilitleyip tek bir transaction içinde yapılır.
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Membership, Wallet, WalletEntry, WalletEntryKind
from .packages import resolve


class WalletError(Exception):
    """Bakiye işlemi iş kuralına takıldı (ör. bakiye yetersiz)."""


def get_wallet(user) -> Wallet:
    """Kullanıcının cüzdanı; yoksa sıfır bakiyeyle oluşturulur."""
    wallet, _created = Wallet.objects.get_or_create(user=user)
    return wallet


def get_membership(user) -> Membership:
    """Kullanıcının üyelik satırı; yoksa boş (paketsiz) olarak oluşturulur."""
    membership, _created = Membership.objects.get_or_create(user=user)
    return membership


@transaction.atomic
def adjust_balance(user, amount: Decimal, *, kind: str, note: str = "", actor=None) -> WalletEntry:
    """Bakiyeye ``amount`` kadar ekler (negatif değer düşer) ve deftere yazar.

    Bakiyeyi eksiye düşürecek bir düşüm reddedilir: eksi bakiye, ödenmemiş bir
    borcu sessizce kullanıcının hesabına yazmak olurdu.
    """
    if amount == 0:
        raise WalletError("Tutar sıfır olamaz.")

    wallet, _ = Wallet.objects.get_or_create(user=user)
    # Satırı kilitle: aynı anda gelen ikinci bir yükleme bu işlem bitene kadar bekler.
    wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)

    new_balance = wallet.balance + amount
    if new_balance < 0:
        raise WalletError(
            f"Bakiye yetersiz. Mevcut bakiye {wallet.balance} TL, düşülmek istenen {abs(amount)} TL."
        )

    wallet.balance = new_balance
    wallet.save(update_fields=["balance", "updated_at"])

    return WalletEntry.objects.create(
        wallet=wallet,
        amount=amount,
        balance_after=new_balance,
        kind=kind,
        note=note,
        created_by=actor if getattr(actor, "is_authenticated", False) else None,
    )


@transaction.atomic
def assign_membership(
    user,
    package_code: str,
    tier_code: str,
    *,
    actor=None,
    charge_wallet: bool = False,
    note: str = "",
) -> Membership:
    """Kullanıcıya paket tanımlar (veya mevcut paketini değiştirir).

    ``charge_wallet=True`` ise paketin ücreti kullanıcının bakiyesinden düşülür
    — havale yapan kullanıcıya önce bakiye yükleyip sonra paketi bu bakiyeden
    satmak, admin panelindeki normal akıştır. Bakiye yetmezse işlemin tamamı
    geri alınır ve paket tanımlanmaz.

    Süre her zaman **şu andan** başlar: kalan gün devretmez. Bu bilinçli bir
    sadeleştirmedir; devir kuralı istendiğinde burada tek yerde değişir.
    """
    resolved = resolve(package_code, tier_code)
    if resolved is None:
        raise WalletError("Geçersiz paket veya süre.")
    package, tier = resolved

    membership = get_membership(user)
    now = timezone.now()

    if charge_wallet:
        adjust_balance(
            user,
            -tier.price,
            kind=WalletEntryKind.PACKAGE_PURCHASE,
            note=note or f"{package.name} · {tier.label}",
            actor=actor,
        )

    membership.package_code = package.code
    membership.package_name = package.name
    membership.tier_code = tier.code
    membership.tier_label = tier.label
    membership.application_quota = tier.applications
    membership.campaign_quota = tier.active_campaigns
    # Yeni paket, başvuru sayacını sıfırlar: kullanıcı yeni hakkını baştan alır.
    membership.applications_used = 0
    membership.starts_at = now
    membership.expires_at = now + timedelta(days=tier.days)
    membership.assigned_by = actor if getattr(actor, "is_authenticated", False) else None
    membership.save()
    return membership


@transaction.atomic
def clear_membership(user, *, actor=None) -> Membership:
    """Paketi kaldırır. Satır silinmez, boşaltılır — geçmiş alanlar sıfırlanır."""
    membership = get_membership(user)
    membership.package_code = ""
    membership.package_name = ""
    membership.tier_code = ""
    membership.tier_label = ""
    membership.application_quota = None
    membership.campaign_quota = 0
    membership.applications_used = 0
    membership.starts_at = None
    membership.expires_at = None
    membership.assigned_by = actor if getattr(actor, "is_authenticated", False) else None
    membership.save()
    return membership
