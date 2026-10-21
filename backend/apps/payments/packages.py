"""Üyelik paketleri kataloğu.

Adminin bir kullanıcıya paket atayabilmesi için sunucunun paketleri, sürelerini,
başvuru haklarını ve fiyatlarını bilmesi gerekir. Bu dosya bunun **sunucu
tarafındaki kaynağıdır**.

Pazarlama sayfalarındaki kartlar aynı listeyi ``frontend/lib/content/packages.ts``
içinden okur (herkese açık sayfalar bir API çağrısı beklemeden render olsun
diye). İki listenin ayrışmaması ``apps/payments/tests.py::PackageCatalogParityTests``
ile kontrol edilir — fiyat değiştirirken **iki dosyayı birlikte** güncelleyin.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

CREATOR = "creator"
BRAND = "brand"

# Sınırsız başvuru hakkı; quota alanında None ile temsil edilir.
UNLIMITED = None


@dataclass(frozen=True)
class Tier:
    """Bir paketin tek bir süre seçeneği."""

    code: str
    label: str
    days: int
    price: Decimal
    #: Bu sürede yapılabilecek başvuru sayısı; ``None`` sınırsız demektir.
    applications: int | None
    #: Markanın aynı anda yayında tutabileceği kampanya sayısı; ``None``
    #: sınırsız, ``0`` ilgisiz (creator paketleri kampanya açmaz).
    active_campaigns: int | None = 0


@dataclass(frozen=True)
class Package:
    code: str
    name: str
    audience: str
    tiers: tuple[Tier, ...]

    def tier(self, code: str) -> Tier | None:
        return next((t for t in self.tiers if t.code == code), None)


THREE_DAYS = "3d"
WEEKLY = "weekly"
MONTHLY = "monthly"

TIER_LABELS = {THREE_DAYS: "3 Günlük", WEEKLY: "Haftalık", MONTHLY: "Aylık"}

PACKAGES: tuple[Package, ...] = (
    Package(
        code="classic-creator",
        name="Classic Creator",
        audience=CREATOR,
        tiers=(
            Tier(THREE_DAYS, TIER_LABELS[THREE_DAYS], 3, Decimal("149"), 3),
            Tier(WEEKLY, TIER_LABELS[WEEKLY], 7, Decimal("399"), 10),
            Tier(MONTHLY, TIER_LABELS[MONTHLY], 30, Decimal("699"), 22),
        ),
    ),
    Package(
        code="premium-creator",
        name="Premium Creator",
        audience=CREATOR,
        tiers=(
            Tier(THREE_DAYS, TIER_LABELS[THREE_DAYS], 3, Decimal("249"), 5),
            Tier(WEEKLY, TIER_LABELS[WEEKLY], 7, Decimal("699"), 20),
            Tier(MONTHLY, TIER_LABELS[MONTHLY], 30, Decimal("1299"), 50),
        ),
    ),
    Package(
        code="baslangic-marka",
        name="Başlangıç Marka",
        audience=BRAND,
        tiers=(Tier(MONTHLY, TIER_LABELS[MONTHLY], 30, Decimal("499"), 50, active_campaigns=5),),
    ),
    Package(
        code="profesyonel-marka",
        name="Profesyonel Marka",
        audience=BRAND,
        tiers=(Tier(MONTHLY, TIER_LABELS[MONTHLY], 30, Decimal("999"), 150, active_campaigns=15),),
    ),
    Package(
        code="kurumsal-marka",
        name="Kurumsal Marka",
        audience=BRAND,
        tiers=(Tier(MONTHLY, TIER_LABELS[MONTHLY], 30, Decimal("1999"), UNLIMITED, active_campaigns=UNLIMITED),),
    ),
)

PACKAGES_BY_CODE = {package.code: package for package in PACKAGES}

#: Kullanıcı rolü → o rolün satın alabileceği paket kitlesi. Admin/moderatör
#: hiçbir kitleye ait değildir: kendilerine paket satın almazlar, panelden
#: başkasına atarlar.
AUDIENCE_BY_ROLE = {"creator": CREATOR, "brand": BRAND}


def get_package(code: str) -> Package | None:
    return PACKAGES_BY_CODE.get(code)


def audience_for_user(user) -> str | None:
    """Kullanıcının kendisi için satın alabileceği paket kitlesi.

    Kitlesi olmayan hesaplar (admin, moderatör) için ``None`` döner — bu
    "kısıtlama yok" demektir, "hiçbir paket olmaz" demek değildir.
    """
    return AUDIENCE_BY_ROLE.get(getattr(user, "role", "") or "")


def packages_for_audience(audience: str) -> tuple[Package, ...]:
    return tuple(package for package in PACKAGES if package.audience == audience)


def resolve(package_code: str, tier_code: str) -> tuple[Package, Tier] | None:
    """Paket + süre çiftini doğrular. Geçersizse ``None`` döner."""
    package = get_package(package_code)
    if package is None:
        return None
    tier = package.tier(tier_code)
    if tier is None:
        return None
    return package, tier


def catalog_payload() -> list[dict]:
    """Admin panelinin paket seçicisini beslediği serileştirilmiş katalog."""
    return [
        {
            "code": package.code,
            "name": package.name,
            "audience": package.audience,
            "tiers": [
                {
                    "code": tier.code,
                    "label": tier.label,
                    "days": tier.days,
                    "price": str(tier.price),
                    "applications": tier.applications,
                    "active_campaigns": tier.active_campaigns,
                }
                for tier in package.tiers
            ],
        }
        for package in PACKAGES
    ]
