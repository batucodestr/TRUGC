"""Sanal POS sağlayıcı kayıt defteri.

Hangi sağlayıcının kullanılacağı ``POS_PROVIDER`` ortam değişkeniyle seçilir.
Boş bırakılırsa ödeme başlatma uçları açıkça "yapılandırılmadı" hatası döner —
sessizce "başarılı" davranan hiçbir varsayılan yoktur.
"""

from django.conf import settings

from .base import (
    CallbackResult,
    CheckoutSession,
    PosError,
    PosNotConfigured,
    PosProvider,
)
from .iyzico import IyzicoProvider
from .paytr import PayTRProvider
from .sandbox import SandboxProvider

PROVIDERS = {
    IyzicoProvider.name: IyzicoProvider,
    PayTRProvider.name: PayTRProvider,
    SandboxProvider.name: SandboxProvider,
}

__all__ = [
    "CallbackResult",
    "CheckoutSession",
    "PosError",
    "PosNotConfigured",
    "PosProvider",
    "PROVIDERS",
    "get_pos_provider",
    "pos_status",
]


def get_pos_provider(name: str | None = None) -> PosProvider:
    """Yapılandırılmış sağlayıcıyı döner; yoksa PosNotConfigured yükseltir."""
    provider_name = (name or getattr(settings, "POS_PROVIDER", "") or "").strip().lower()
    if not provider_name:
        raise PosNotConfigured(
            "Sanal POS sağlayıcısı seçilmemiş. POS_PROVIDER ortam değişkenini "
            "(iyzico veya paytr) ve ilgili API anahtarlarını tanımlayın."
        )
    provider_class = PROVIDERS.get(provider_name)
    if provider_class is None:
        raise PosNotConfigured(
            f"Bilinmeyen POS sağlayıcısı: {provider_name}. Desteklenenler: " + ", ".join(sorted(PROVIDERS))
        )
    return provider_class()


def pos_status() -> dict:
    """Admin/frontend için POS yapılandırma özeti (hiçbir gizli bilgi içermez)."""
    provider_name = (getattr(settings, "POS_PROVIDER", "") or "").strip().lower()
    if not provider_name:
        return {
            "provider": "",
            "configured": False,
            "missing_settings": ["POS_PROVIDER"],
            "supported_providers": sorted(PROVIDERS),
        }
    provider_class = PROVIDERS.get(provider_name)
    if provider_class is None:
        return {
            "provider": provider_name,
            "configured": False,
            "missing_settings": ["POS_PROVIDER (geçersiz değer)"],
            "supported_providers": sorted(PROVIDERS),
        }
    provider = provider_class()
    return {
        "provider": provider.name,
        "configured": provider.is_configured(),
        "missing_settings": provider.missing_settings(),
        "supported_providers": sorted(PROVIDERS),
    }
