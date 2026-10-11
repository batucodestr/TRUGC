"""Üyelik paketi kurallarının uygulanması.

İki kural vardır:

* **Creator** bir kampanyaya başvurduğunda paketinin başvuru hakkından bir adet
  harcanır; hak bittiğinde yeni başvuru yapılamaz.
* **Marka** yeni kampanya yayınlarken paketinin aktif kampanya limiti aşılamaz.

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
def check_application_slot(user) -> None:
    """Başvuru hakkı yoksa ``MembershipRequired`` yükseltir.

    Engelleme kapalıyken hiçbir şey yapmaz; çağrı noktaları yine de bu
    fonksiyonu çağırır, böylece anahtar açıldığında kod değişmez.
    """
    if not enforcement_enabled() or is_exempt(user):
        return

    membership = _membership(user)
    if not membership.is_active:
        raise MembershipRequired(
            "Kampanyalara başvurmak için aktif bir creator üyelik paketiniz olmalı. "
            "Paketleri fiyatlandırma sayfasından inceleyebilirsiniz."
        )
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


# ---------------------------------------------------------------------------
# Marka: aktif kampanya limiti
# ---------------------------------------------------------------------------
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
