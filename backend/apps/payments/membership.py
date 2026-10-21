"""Üyelik paketi kurallarının uygulanması.

Üç kural vardır:

* **Creator** bir kampanyaya başvurduğunda paketinin başvuru hakkından bir adet
  harcanır; hak bittiğinde yeni başvuru yapılamaz. Paketi yoksa başvuru
  kaydedilir ama ödeme yapılana kadar markaya iletilmez.
* **Mesajlaşma** gönderen tarafta aktif paket ister.
* **Marka** yeni kampanya yayınlarken paketinin aktif kampanya limiti aşılamaz.
  Paketi yoksa ilanı taslak olarak kaydedilir ve ödeme onaylanınca yayına
  girer.

Bu modül kuralların **tek** uygulanma noktasıdır; view'lar sayaçlara doğrudan
dokunmaz.

İki ayrı kavram
---------------
``MEMBERSHIP_ENFORCED`` (varsayılan **False**) yalnızca *engellemeyi* açar.
Sayaçlar bayraktan bağımsız olarak **her zaman** işler. Bunun sebebi, paketler
henüz satılmamışken engellemeyi açmanın platformdaki bütün creator'ları bir
anda başvuru yapamaz hale getirecek olmasıdır: önce paketler satılır ve
sayaçlardan gerçek kullanım görülür, engelleme sonra açılır. Sayaçlar baştan
işlediği için anahtar açıldığında kimse sürprizle karşılaşmaz.

Muafiyetler
-----------
* **Ücretsiz dönem** (hafta sonu): platform tamamen ücretsizken paket şartı
  aranmaz — bkz. apps/common/pricing.py.
* **Staff / admin / moderatör**: moderasyon işleri paket arkasına alınmaz.
"""

from __future__ import annotations

from django.conf import settings
from django.db.models import F

from apps.common import pricing

from .models import Membership
from .wallet import get_membership


class MembershipRequired(Exception):
    """Kullanıcının bu işlem için geçerli bir paketi yok (veya hakkı bitti)."""


def enforcement_enabled() -> bool:
    """Engellemenin açık olup olmadığı. Sayaçlar bundan etkilenmez."""
    return bool(getattr(settings, "MEMBERSHIP_ENFORCED", False))


def is_exempt(user) -> bool:
    """Kural dışı tutulan durumlar: ücretsiz dönem ve yetkili hesaplar."""
    return pricing.is_free_period() or pricing.is_privileged(user)


def _membership(user) -> Membership:
    """Paketi **veritabanından taze** okur.

    Bilerek ``user.membership`` üzerinden gidilmez: Django bu one-to-one
    bağlantıyı örnek üzerinde önbelleğe alır ve ``consume_application``
    sayacı ``UPDATE`` ile artırdığı için önbellekteki kopya eskir. Hak
    kontrolünü eski bir kopyaya dayandırmak, hakkı bitmiş bir kullanıcının
    başvuru yapabilmesi demek olurdu.
    """
    return get_membership(user)


def active_membership(user) -> Membership | None:
    """Kullanıcının **aktif** paketi; yoksa ``None``."""
    membership = _membership(user)
    return membership if membership.is_active else None


# ---------------------------------------------------------------------------
# Creator: kampanya başvurusu
# ---------------------------------------------------------------------------
def application_needs_payment(user) -> bool:
    """Yeni başvuru, creator ödeme yapana kadar markadan gizli mi tutulacak?

    Paketi olmayan creator'ın başvurusu reddedilmez: kaydedilir, creator ödeme
    ekranına gönderilir ve paketi tanımlandığında başvuru markaya iletilir
    (bkz. ``release_awaiting_applications``).
    """
    if not enforcement_enabled() or is_exempt(user):
        return False
    return active_membership(user) is None


def check_application_slot(user) -> None:
    """Aktif paketin başvuru hakkı bittiyse ``MembershipRequired`` yükseltir.

    Paketi hiç olmayan creator burada engellenmez — başvurusu ödeme bekler
    (bkz. ``application_needs_payment``).
    """
    if not enforcement_enabled() or is_exempt(user):
        return

    membership = _membership(user)
    if not membership.is_active:
        return
    if not membership.has_application_slot:
        raise MembershipRequired(
            f"{membership.package_name} · {membership.tier_label} paketinizdeki "
            f"{membership.application_quota} başvuru hakkının tamamını kullandınız. "
            "Yeni başvuru için paketinizi yenileyin."
        )


def consume_application(user) -> None:
    """Bir başvuru hakkı harcar.

    ``F()`` ile artırılır: aynı anda iki başvuru gelirse ikisi de sayılır
    (Python'da okuyup yazmak birini kaybettirirdi).

    Sınırsız pakette ve paketi olmayan kullanıcıda sayaç artırılmaz — ikincisi,
    engelleme kapalıyken paketsiz başvuranların sayacını şişirip paket
    aldıklarında haklarını yemiş görünmelerini önler.
    """
    if is_exempt(user):
        return
    membership = _membership(user)
    if not membership.is_active or membership.application_quota is None:
        return
    Membership.objects.filter(pk=membership.pk).update(applications_used=F("applications_used") + 1)


def release_awaiting_applications(user) -> list:
    """Paketi yeni tanımlanan creator'ın ödeme bekleyen başvurularını markalara iletir.

    En eskiden başlayarak kalan hak kadarı serbest bırakılır ve her biri bir
    hak harcar; hakkı aşan başvurular beklemede kalır.
    """
    from apps.applications.models import Application, ApplicationStatus
    from apps.applications.services import notify_brand_of_application

    membership = active_membership(user)
    if membership is None:
        return []

    awaiting = list(
        Application.objects.filter(creator__user=user, awaiting_payment=True, status=ApplicationStatus.PENDING)
        .select_related("campaign__brand__user", "creator__user")
        .order_by("created_at")
    )
    remaining = membership.remaining_applications
    if remaining is not None:
        awaiting = awaiting[:remaining]
    if not awaiting:
        return []

    Application.objects.filter(pk__in=[a.pk for a in awaiting]).update(awaiting_payment=False)
    if membership.application_quota is not None:
        Membership.objects.filter(pk=membership.pk).update(applications_used=F("applications_used") + len(awaiting))
    for application in awaiting:
        application.awaiting_payment = False
        notify_brand_of_application(application)
    return awaiting


# ---------------------------------------------------------------------------
# Mesajlaşma
# ---------------------------------------------------------------------------
def check_messaging(user, others=()) -> None:
    """Mesaj göndermek için aktif paket şartı.

    Destek ekibiyle (staff/admin/moderatör) yazışma paket arkasına alınmaz.
    """
    if not enforcement_enabled() or is_exempt(user):
        return
    if any(pricing.is_privileged(other) for other in others):
        return
    if active_membership(user) is None:
        raise MembershipRequired(
            "Mesaj gönderebilmek için aktif bir üyelik paketiniz olmalı. "
            "Ödemeniz onaylandığında mesajlaşma hemen açılır."
        )


# ---------------------------------------------------------------------------
# Arayüz için özet
# ---------------------------------------------------------------------------
def gates_for(user) -> dict:
    """Hangi işlemin ödeme isteyeceğinin özeti (GET /payments/me/wallet/).

    Arayüz bunu kullanıcı 402'ye çarpmadan önce uyarı göstermek için okur;
    hafta sonu muafiyeti ve ``MEMBERSHIP_ENFORCED`` istemcide
    hesaplanamadığından karar burada verilir. Engelin kendisi yine her uçta
    ayrıca uygulanır.
    """
    role = getattr(user, "role", "")
    try:
        check_messaging(user)
        messaging_locked = False
    except MembershipRequired:
        messaging_locked = True
    return {
        "messaging_locked": messaging_locked,
        "application_needs_payment": role == "creator" and application_needs_payment(user),
        "campaign_needs_payment": role == "brand" and campaign_needs_payment(user),
    }


# ---------------------------------------------------------------------------
# Marka: aktif kampanya limiti
# ---------------------------------------------------------------------------
def campaign_needs_payment(user) -> bool:
    """Yayınlanmak istenen ilan, marka ödeme yapana kadar taslakta mı bekleyecek?

    Creator başvurusundaki ``application_needs_payment``'ın marka karşılığı:
    paketi olmayan markanın ilanı reddedilmez, ödeme bekler halde kaydedilir
    (bkz. ``release_awaiting_campaigns``).
    """
    if not enforcement_enabled() or is_exempt(user):
        return False
    return active_membership(user) is None


def release_awaiting_campaigns(user) -> list:
    """Paketi yeni tanımlanan markanın ödeme bekleyen ilanlarını yayına alır.

    En eskiden başlayarak paketin aktif kampanya limiti kadarı yayınlanır;
    limiti aşanlar taslak olarak kalır, marka onları istediği zaman elle
    yayına alabilir.
    """
    from apps.campaigns.models import Campaign, CampaignStatus
    from apps.notifications.models import NotificationType
    from apps.notifications.services import notify_user

    membership = active_membership(user)
    brand = getattr(user, "brand", None)
    if membership is None or brand is None:
        return []

    awaiting = list(
        Campaign.objects.filter(brand=brand, awaiting_payment=True, status=CampaignStatus.DRAFT).order_by("created_at")
    )
    quota = membership.campaign_quota
    if quota is not None:
        published = Campaign.objects.filter(brand=brand, status=CampaignStatus.PUBLISHED).count()
        awaiting = awaiting[: max(quota - published, 0)]
    if not awaiting:
        return []

    Campaign.objects.filter(pk__in=[c.pk for c in awaiting]).update(
        status=CampaignStatus.PUBLISHED, awaiting_payment=False
    )
    for campaign in awaiting:
        campaign.status = CampaignStatus.PUBLISHED
        campaign.awaiting_payment = False
        notify_user(
            user=user,
            title="İlanınız yayında",
            body=f'Ödemeniz onaylandı, "{campaign.title}" kampanyanız yayına alındı ve başvuru kabul ediyor.',
            notification_type=NotificationType.CAMPAIGN,
            link="/dashboard/brand/campaigns",
        )
    return awaiting


def check_campaign_slot(user) -> None:
    """Markanın aktif kampanya limiti doluysa ``MembershipRequired`` yükseltir."""
    if not enforcement_enabled() or is_exempt(user):
        return

    membership = _membership(user)
    if not membership.is_active:
        raise MembershipRequired(
            "Kampanya yayınlamak için aktif bir marka üyelik paketiniz olmalı. "
            "Paketleri fiyatlandırma sayfasından inceleyebilirsiniz."
        )

    quota = membership.campaign_quota
    if quota is None:  # sınırsız
        return

    brand = getattr(user, "brand", None)
    if brand is None:
        return

    # Döngüsel import olmasın diye yerel import.
    from apps.campaigns.models import Campaign, CampaignStatus

    active = Campaign.objects.filter(brand=brand, status=CampaignStatus.PUBLISHED).count()
    if active >= quota:
        raise MembershipRequired(
            f"{membership.package_name} paketiniz aynı anda {quota} aktif kampanyaya izin veriyor "
            f"({active} kampanyanız yayında). Yeni kampanya için bir kampanyayı kapatın "
            "veya paketinizi yükseltin."
        )
