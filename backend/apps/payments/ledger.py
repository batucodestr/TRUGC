"""Muhasebe defteri, iş birliği ödemesi, creator hak edişi ve iade servisleri.

Kurallar
--------
* Defter satırı silinmez/değiştirilmez; düzeltme **ters kayıtla** yapılır.
* Komisyon markaya eklenir: marka ``bütçe + %10`` öder, creator bütçenin
  tamamını alır (komisyon creator kazancından kesilmez).
* Para tutma/dağıtma PayTR pazaryeri altyapısındadır; burada kendi emanet
  hesabımız yoktur, yalnızca kayıt tutarız.
* Tüm fonksiyonlar **idempotent**tir: PayTR aynı bildirimi tekrar yollarsa
  ikinci kez kayıt/bakiye oluşmaz.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.common import pricing
from apps.notifications.models import NotificationType
from apps.notifications.services import notify_user

from .models import (
    CollaborationPayment,
    CollaborationPaymentStatus,
    CreatorEarning,
    CreatorEarningStatus,
    LedgerEntry,
    LedgerEntryType,
    PaymentPurpose,
    PosPayment,
    PosPaymentStatus,
)

CENT = Decimal("0.01")


def money(value) -> Decimal:
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def commission_for(budget: Decimal) -> Decimal:
    """Bütçe üzerine eklenen platform komisyonu (varsayılan %10)."""
    return money(Decimal(budget) * pricing.configured_commission_percent() / Decimal("100"))


def vat_included(gross: Decimal) -> Decimal:
    """KDV dahil tutarın içindeki KDV payı."""
    rate = Decimal(str(getattr(settings, "VAT_PERCENT", "20")))
    return money(Decimal(gross) * rate / (Decimal("100") + rate))


def charge_breakdown(budget: Decimal) -> dict:
    budget = money(budget)
    commission = commission_for(budget)
    total = budget + commission
    return {"budget": budget, "commission": commission, "total": total, "vat": vat_included(total)}


def post(entry_type, *, party, party_role, amount, order_no="", collaboration=None, pos_payment=None,
         commission=Decimal("0"), vat=Decimal("0"), note="", reverses=None, status="posted") -> LedgerEntry:
    return LedgerEntry.objects.create(
        entry_type=entry_type,
        party=party,
        party_role=party_role,
        amount=money(amount),
        commission_amount=money(commission),
        vat_amount=money(vat),
        currency=pricing.currency(),
        order_no=order_no,
        collaboration=collaboration,
        pos_payment=pos_payment,
        reverses=reverses,
        note=note[:255],
        status=status,
    )


def reverse_entry(entry: LedgerEntry, *, note: str = "") -> LedgerEntry:
    """``entry``'nin tutarı negatif ters kaydını açar (zaten tersleniyse mevcut olanı döner)."""
    existing = LedgerEntry.objects.filter(reverses=entry).first()
    if existing:
        return existing
    return post(
        entry.entry_type,
        party=entry.party,
        party_role=entry.party_role,
        amount=-entry.amount,
        commission=-entry.commission_amount,
        vat=-entry.vat_amount,
        order_no=entry.order_no,
        collaboration=entry.collaboration,
        pos_payment=entry.pos_payment,
        reverses=entry,
        note=note or f"Ters kayıt #{entry.pk}",
    )


# ---------------------------------------------------------------------------
# Üyelik ödemesi
# ---------------------------------------------------------------------------
def record_membership_payment(user, amount, *, order_no: str = "", pos_payment=None, note: str = "") -> LedgerEntry | None:
    """Üyelik ödemesi için defter satırı (aynı sipariş numarası iki kez yazılmaz)."""
    if order_no and LedgerEntry.objects.filter(
        entry_type=LedgerEntryType.MEMBERSHIP_PAYMENT, order_no=order_no, reverses__isnull=True
    ).exists():
        return None
    return post(
        LedgerEntryType.MEMBERSHIP_PAYMENT,
        party=user,
        party_role=getattr(user, "role", "") or "creator",
        amount=amount,
        vat=vat_included(amount),
        order_no=order_no,
        pos_payment=pos_payment,
        note=note,
    )


# ---------------------------------------------------------------------------
# İş birliği ödemesi (marka → creator)
# ---------------------------------------------------------------------------
class CollaborationPaymentError(Exception):
    pass


@transaction.atomic
def prepare_collaboration_payment(collaboration, brand_user) -> CollaborationPayment:
    """Markanın ödeyeceği tutarı **sunucuda** hesaplayıp bekleyen kayıt açar (idempotent)."""
    from apps.collaborations.models import CollaborationStatus

    if collaboration.brand.user_id != brand_user.id:
        raise CollaborationPaymentError("Bu iş birliği size ait değil.")
    if collaboration.status != CollaborationStatus.APPROVED:
        raise CollaborationPaymentError("Ödeme yalnızca içerik onaylandıktan sonra başlatılabilir.")
    if collaboration.agreed_amount <= 0:
        raise CollaborationPaymentError("Bu iş birliği için ödenecek tutar tanımlı değil.")

    live = (
        CollaborationPayment.objects.select_for_update()
        .filter(collaboration=collaboration, status__in=[CollaborationPaymentStatus.PENDING, CollaborationPaymentStatus.PAID])
        .first()
    )
    if live is not None:
        if live.status == CollaborationPaymentStatus.PAID:
            raise CollaborationPaymentError("Bu iş birliğinin ödemesi zaten yapılmış.")
        return live

    b = charge_breakdown(collaboration.agreed_amount)
    return CollaborationPayment.objects.create(
        collaboration=collaboration,
        brand_user=brand_user,
        budget_amount=b["budget"],
        commission_amount=b["commission"],
        total_amount=b["total"],
        vat_amount=b["vat"],
    )


def apply_collaboration_payment_success(payment: PosPayment) -> None:
    """PayTR'den doğrulanmış başarılı ödeme sonrası defter + hak ediş + durum (idempotent)."""
    from apps.collaborations import services as collab_services

    # Aynı iş birliği için kullanıcı birden fazla ödeme denemesi açmış olabilir;
    # hangisi ödenirse ödensin, bekleyen tek kayıt o ödemeyle eşlenir.
    cp = (
        CollaborationPayment.objects.select_for_update()
        .filter(collaboration_id=payment.collaboration_id, status=CollaborationPaymentStatus.PENDING)
        .first()
    )
    if cp is None:
        return
    collaboration = cp.collaboration
    # Sunucu tarafı tutar eşleşmesi: PayTR'ye gönderilen ve tahsil edilen tutar kayıtla aynı olmalı.
    if money(payment.amount) != money(cp.total_amount):
        raise CollaborationPaymentError("Ödeme tutarı kayıtla eşleşmiyor.")

    now = timezone.now()
    cp.status = CollaborationPaymentStatus.PAID
    cp.paid_at = now
    cp.pos_payment = payment
    cp.save(update_fields=["status", "paid_at", "pos_payment"])

    oid = payment.merchant_oid
    post(LedgerEntryType.CAMPAIGN_CHARGE, party=cp.brand_user, party_role="brand", amount=cp.total_amount,
         commission=cp.commission_amount, vat=cp.vat_amount, order_no=oid, collaboration=collaboration,
         pos_payment=payment, note="Marka iş birliği tahsilatı (bütçe + komisyon)")
    post(LedgerEntryType.PLATFORM_COMMISSION, party=None, party_role="platform", amount=cp.commission_amount,
         vat=vat_included(cp.commission_amount), order_no=oid, collaboration=collaboration, pos_payment=payment,
         note="Platform komisyonu (%s)" % pricing.configured_commission_percent())
    post(LedgerEntryType.CREATOR_EARNING, party=collaboration.creator.user, party_role="creator",
         amount=cp.budget_amount, order_no=oid, collaboration=collaboration, pos_payment=payment,
         note="Creator hak edişi (komisyon kesilmedi)")

    earning, created = CreatorEarning.objects.get_or_create(
        collaboration=collaboration,
        defaults={"creator_user": collaboration.creator.user, "amount": cp.budget_amount},
    )
    if not created:
        earning.amount = cp.budget_amount
        earning.status = CreatorEarningStatus.PAYABLE
        earning.payout_reference = ""
        earning.paid_out_at = None
        earning.save(update_fields=["amount", "status", "payout_reference", "paid_out_at"])

    collab_services.mark_paid(collaboration)
    notify_user(user=collaboration.creator.user, title="Ödeme yapıldı",
                body=f"\"{collaboration.campaign.title}\" için {cp.budget_amount} TL hak edişiniz oluştu.",
                notification_type=NotificationType.PAYMENT, link="/dashboard/creator/earnings")
    notify_user(user=cp.brand_user, title="Ödemeniz alındı",
                body=f"\"{collaboration.campaign.title}\" ödemesi ({cp.total_amount} TL) alındı.",
                notification_type=NotificationType.PAYMENT, link="/dashboard/brand/payments")

    from .payouts import try_automatic_payout

    try_automatic_payout(earning)


@transaction.atomic
def mark_earning_paid(earning: CreatorEarning, *, actor=None, reference: str = "") -> CreatorEarning:
    """Hak edişin creator'a gerçekten ödendiğini kaydeder (ledger: creator_payout)."""
    earning = CreatorEarning.objects.select_for_update().get(pk=earning.pk)
    if earning.status == CreatorEarningStatus.PAID:
        return earning
    if earning.status != CreatorEarningStatus.PAYABLE:
        raise CollaborationPaymentError("Bu hak ediş ödenebilir durumda değil.")
    earning.status = CreatorEarningStatus.PAID
    earning.paid_out_at = timezone.now()
    earning.payout_reference = reference[:128]
    earning.save(update_fields=["status", "paid_out_at", "payout_reference"])
    post(LedgerEntryType.CREATOR_PAYOUT, party=earning.creator_user, party_role="creator", amount=earning.amount,
         order_no=reference or f"EARN{earning.pk}", collaboration=earning.collaboration,
         note="Creator'a ödeme yapıldı")
    notify_user(user=earning.creator_user, title="Kazancınız hesabınıza aktarıldı",
                body=f"{earning.amount} TL ödemeniz gerçekleşti.", notification_type=NotificationType.PAYMENT,
                link="/dashboard/creator/earnings")
    return earning


# ---------------------------------------------------------------------------
# İade
# ---------------------------------------------------------------------------
@transaction.atomic
def refund_collaboration_payment(collaboration, *, actor, reason: str = "") -> CollaborationPayment:
    """Marka ödemesini iade eder: sağlayıcı iadesi + ters kayıtlar + hak ediş iptali.

    Creator'a ödeme zaten yapılmışsa otomatik iade reddedilir (para PayTR
    pazaryerinde creator tarafına geçmiştir; elle çözülmelidir).
    """
    from apps.collaborations import services as collab_services

    cp = (
        CollaborationPayment.objects.select_for_update()
        .filter(collaboration=collaboration, status=CollaborationPaymentStatus.PAID)
        .first()
    )
    if cp is None:
        raise CollaborationPaymentError("İade edilecek ödenmiş bir kayıt yok.")
    earning = CreatorEarning.objects.select_for_update().filter(collaboration=collaboration).first()
    if earning is not None and earning.status == CreatorEarningStatus.PAID:
        raise CollaborationPaymentError("Creator'a ödeme yapılmış; otomatik iade edilemez, destek ile iletişime geçin.")

    pos = cp.pos_payment
    _provider_refund(pos, cp.total_amount)

    for entry in LedgerEntry.objects.filter(collaboration=collaboration, reverses__isnull=True).exclude(
        entry_type=LedgerEntryType.CREATOR_PAYOUT
    ):
        reverse_entry(entry, note=f"İade: {reason}"[:255])

    cp.status = CollaborationPaymentStatus.REFUNDED
    cp.refunded_at = timezone.now()
    cp.refund_reason = reason[:255]
    cp.save(update_fields=["status", "refunded_at", "refund_reason"])
    if earning is not None:
        earning.status = CreatorEarningStatus.CANCELLED
        earning.save(update_fields=["status"])
    collab_services.cancel(collaboration, actor=actor, note=f"Ödeme iade edildi: {reason}")
    notify_user(user=cp.brand_user, title="Ödemeniz iade edildi",
                body=f"{cp.total_amount} TL tutarındaki ödemeniz iade sürecine alındı.",
                notification_type=NotificationType.PAYMENT, link="/dashboard/brand/payments")
    return cp


def _provider_refund(pos: PosPayment | None, amount) -> None:
    if pos is None:
        return
    from .pos import get_pos_provider

    provider = get_pos_provider(pos.provider)
    refund = getattr(provider, "refund", None)
    if refund is None:
        raise CollaborationPaymentError("Bu ödeme sağlayıcısı otomatik iadeyi desteklemiyor.")
    refund(pos, money(amount))


@transaction.atomic
def refund_membership_payment(pos_payment: PosPayment, *, actor, reason: str = "") -> None:
    """Kartla alınan üyelik ödemesini iade eder; üyelik kaldırılır ve defter ters kaydedilir."""
    from . import wallet as wallet_service

    pos = PosPayment.objects.select_for_update().get(pk=pos_payment.pk)
    if pos.purpose != PaymentPurpose.PACKAGE or pos.status != PosPaymentStatus.PAID:
        raise CollaborationPaymentError("Yalnızca ödenmiş üyelik ödemeleri iade edilebilir.")
    entries = list(LedgerEntry.objects.filter(pos_payment=pos, reverses__isnull=True))
    if entries and all(LedgerEntry.objects.filter(reverses=e).exists() for e in entries):
        return  # zaten iade edilmiş (idempotent)
    _provider_refund(pos, pos.amount)
    for entry in entries:
        reverse_entry(entry, note=f"Üyelik iadesi: {reason}"[:255])
    wallet_service.clear_membership(pos.user, actor=actor)
    notify_user(user=pos.user, title="Üyelik ödemeniz iade edildi",
                body=f"{pos.amount} TL iade sürecine alındı, üyeliğiniz sonlandırıldı.",
                notification_type=NotificationType.PAYMENT, link="/dashboard")
