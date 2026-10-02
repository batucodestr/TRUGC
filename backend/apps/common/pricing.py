"""Merkezi erişim/ücretlendirme kontrolü — "hafta sonu ücretsiz, hafta içi ücretli".

Bu modül, platformun o anda ücretli mi ücretsiz mi çalıştığına dair **tek
gerçek kaynağıdır**. Hem izin (permission) sınıfları, hem serializer'lar, hem
de frontend'in okuduğu genel `GET /api/v1/payments/pricing/` endpoint'i buradan
beslenir; böylece "fiyatı gizle" ile "ücreti tahsil etme" kararları asla
birbirinden ayrışamaz.

Tasarım notları
---------------
* **Saat her zaman sunucudan okunur** (``django.utils.timezone.now()``).
  Kullanıcının cihaz saatine, tarayıcı saat dilimine veya istemciden gelen
  herhangi bir tarih alanına asla güvenilmez — frontend yalnızca bu modülün
  ürettiği durumu *gösterir*, kendisi gün hesaplamaz.
* Takvim günü, ``BILLING_TIMEZONE`` (varsayılan ``Europe/Istanbul``) saat
  diliminde değerlendirilir. Django'nun ``TIME_ZONE``'u UTC olduğu için, bu
  ayrım olmadan Cumartesi 02:00 (TR) hâlâ Cuma sayılırdı.
* Hiçbir fonksiyon modül düzeyinde önbelleğe alınmaz; her çağrı ayarları
  yeniden okur, böylece ``override_settings`` ile test edilebilir ve ayar
  değişikliği için process restart gerekmez.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.utils import timezone

# Python'un ``datetime.weekday()`` sözleşmesi: Pazartesi=0 ... Pazar=6.
MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY = range(7)

WEEKDAY_LABELS_TR = {
    MONDAY: "Pazartesi",
    TUESDAY: "Salı",
    WEDNESDAY: "Çarşamba",
    THURSDAY: "Perşembe",
    FRIDAY: "Cuma",
    SATURDAY: "Cumartesi",
    SUNDAY: "Pazar",
}

DEFAULT_FREE_WEEKDAYS = (SATURDAY, SUNDAY)
DEFAULT_TIMEZONE = "Europe/Istanbul"
DEFAULT_COMMISSION_PERCENT = Decimal("10")

FREE_PERIOD_NOTICE = (
    "Hafta sonu (Cumartesi ve Pazar) TRUGC tamamen ücretsizdir: ilan oluşturma, "
    "iş alma ve creator erişimi için hiçbir ücret alınmaz."
)
PAID_PERIOD_NOTICE = "Hafta içi (Pazartesi–Cuma) ücretlendirme aktiftir."


# ---------------------------------------------------------------------------
# Ayar okuma yardımcıları
# ---------------------------------------------------------------------------
def billing_timezone() -> ZoneInfo:
    """Ücretlendirme takvim gününün değerlendirildiği saat dilimi."""
    name = getattr(settings, "BILLING_TIMEZONE", DEFAULT_TIMEZONE) or DEFAULT_TIMEZONE
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        # Hatalı yapılandırma, ücretlendirmeyi tamamen bozmak yerine güvenli
        # bir varsayılana düşer (ve aşağıdaki pricing_state() çıktısında
        # hangi saat diliminin kullanıldığı her zaman görünür).
        return ZoneInfo(DEFAULT_TIMEZONE)


def free_weekdays() -> tuple[int, ...]:
    """Ücretsiz günlerin ``weekday()`` indeksleri (Pazartesi=0). Varsayılan: Cumartesi+Pazar."""
    raw = getattr(settings, "BILLING_FREE_WEEKDAYS", DEFAULT_FREE_WEEKDAYS)
    if isinstance(raw, (str, bytes)):
        raw = [part for part in str(raw).replace(" ", "").split(",") if part]
    days: list[int] = []
    for item in raw or ():
        try:
            day = int(item)
        except (TypeError, ValueError):
            continue
        if 0 <= day <= 6 and day not in days:
            days.append(day)
    return tuple(sorted(days))


def free_period_enabled() -> bool:
    """Hafta sonu ücretsiz kullanımın ana açma/kapama anahtarı."""
    return bool(getattr(settings, "BILLING_FREE_PERIOD_ENABLED", True))


def configured_commission_percent() -> Decimal:
    raw = getattr(settings, "PLATFORM_COMMISSION_PERCENT", DEFAULT_COMMISSION_PERCENT)
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return DEFAULT_COMMISSION_PERCENT
    return value if value >= 0 else Decimal("0")


def currency() -> str:
    return str(getattr(settings, "BILLING_CURRENCY", "TRY") or "TRY")


# ---------------------------------------------------------------------------
# Çekirdek mantık
# ---------------------------------------------------------------------------
def server_now() -> datetime:
    """Sunucunun kendi saati (UTC, timezone-aware). İstemci saati asla kullanılmaz."""
    return timezone.now()


def local_now(at: datetime | None = None) -> datetime:
    """Ücretlendirme saat dilimine çevrilmiş zaman damgası."""
    moment = at or server_now()
    if timezone.is_naive(moment):
        moment = timezone.make_aware(moment, timezone.get_default_timezone())
    return moment.astimezone(billing_timezone())


def is_free_weekday(weekday: int) -> bool:
    return free_period_enabled() and weekday in free_weekdays()


def is_free_period(at: datetime | None = None) -> bool:
    """Verilen anda (varsayılan: şimdi) platform ücretsiz mi?"""
    return is_free_weekday(local_now(at).weekday())


def is_paid_period(at: datetime | None = None) -> bool:
    """Ücretlendirmenin aktif olduğu an mı? ``is_free_period``'ın tersi."""
    return not is_free_period(at)


def next_transition(at: datetime | None = None) -> datetime | None:
    """Ücretsiz/ücretli durumun değişeceği ilk yerel gece yarısı.

    Hafta sonu ücretsiz kullanım tamamen kapatıldığında (veya her gün ücretsiz/
    ücretli olacak şekilde yapılandırıldığında) bir geçiş noktası yoktur ve
    ``None`` döner.
    """
    current = local_now(at)
    today_is_free = is_free_weekday(current.weekday())
    for offset in range(1, 8):
        candidate = current.date() + timedelta(days=offset)
        if is_free_weekday(candidate.weekday()) != today_is_free:
            return datetime.combine(candidate, time.min, tzinfo=billing_timezone())
    return None


def commission_percent(at: datetime | None = None) -> Decimal:
    """Ücretsiz dönemde komisyon sıfırdır; aksi halde yapılandırılmış orandır."""
    return Decimal("0") if is_free_period(at) else configured_commission_percent()


def brand_access_price(at: datetime | None = None) -> Decimal:
    """Markanın creator dizinine erişim paketi fiyatı (ücretsiz dönemde 0)."""
    if is_free_period(at):
        return Decimal("0")
    raw = getattr(settings, "BRAND_ACCESS_PRICE", "0")
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")
    return value if value >= 0 else Decimal("0")


def brand_access_days() -> int:
    try:
        days = int(getattr(settings, "BRAND_ACCESS_DAYS", 30))
    except (TypeError, ValueError):
        return 30
    return days if days > 0 else 30


def payments_enabled(at: datetime | None = None) -> bool:
    """Ödeme akışının (emanet + sanal POS) kullanılabilir olduğu an mı?"""
    return is_paid_period(at)


def should_hide_prices(user=None, at: datetime | None = None) -> bool:
    """Fiyat alanlarının API yanıtlarından gizlenmesi gerekip gerekmediği.

    Ücretsiz dönemde fiyatlar **backend tarafında** gizlenir (yalnızca
    frontend'de saklanmaz) — tek istisna staff/moderatör/admin hesaplarıdır:
    /manage panelinin raporlama ekranları hafta sonu da gerçek tutarları
    görmeye devam eder, aksi halde moderasyon kör uçuşa dönerdi.
    """
    if not is_free_period(at):
        return False
    return not is_privileged(user)


def is_privileged(user) -> bool:
    """Staff/moderatör/admin mi? (Ücret/gizleme kurallarının dışında tutulurlar.)"""
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "role", None) in ("admin", "moderator")
    )


@dataclass(frozen=True)
class PricingState:
    free: bool
    enabled: bool
    weekday: int
    weekday_label: str
    local_time: datetime
    free_weekdays: tuple[int, ...]
    next_change_at: datetime | None
    commission_percent: Decimal
    currency: str

    def as_dict(self) -> dict:
        return {
            "free": self.free,
            "paid": not self.free,
            "payments_enabled": not self.free,
            "weekend_free_enabled": self.enabled,
            "timezone": str(self.local_time.tzinfo),
            "server_time": self.local_time.isoformat(),
            "weekday": self.weekday,
            "weekday_label": self.weekday_label,
            "free_weekdays": list(self.free_weekdays),
            "free_weekday_labels": [WEEKDAY_LABELS_TR[d] for d in self.free_weekdays],
            "next_change_at": self.next_change_at.isoformat() if self.next_change_at else None,
            "commission_percent": str(self.commission_percent),
            "currency": self.currency,
            "notice": FREE_PERIOD_NOTICE if self.free else PAID_PERIOD_NOTICE,
        }


def pricing_state(at: datetime | None = None) -> PricingState:
    """Frontend'e ve admin paneline servis edilen tam ücretlendirme durumu."""
    moment = local_now(at)
    weekday = moment.weekday()
    free = is_free_weekday(weekday)
    return PricingState(
        free=free,
        enabled=free_period_enabled(),
        weekday=weekday,
        weekday_label=WEEKDAY_LABELS_TR[weekday],
        local_time=moment,
        free_weekdays=free_weekdays(),
        next_change_at=next_transition(moment),
        commission_percent=Decimal("0") if free else configured_commission_percent(),
        currency=currency(),
    )
