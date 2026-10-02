"""Harici çağrı yapmayan test sağlayıcısı (uçtan uca akışı denemek için).

``POS_PROVIDER=sandbox`` ile açıkça seçilmediği sürece devreye girmez ve
``DEBUG=False`` olan bir ortamda yalnızca ``POS_SANDBOX_ALLOW_IN_PROD=True``
verilmişse çalışır — production'da kazara "her ödeme başarılı" davranışına
düşmeyi imkânsız kılmak için.
"""

from __future__ import annotations

from django.conf import settings

from .base import CallbackResult, CheckoutSession, PosNotConfigured, PosProvider


class SandboxProvider(PosProvider):
    name = "sandbox"
    required_settings = ()

    def _guard(self):
        if not settings.DEBUG and not getattr(settings, "POS_SANDBOX_ALLOW_IN_PROD", False):
            raise PosNotConfigured(
                "Sandbox POS sağlayıcısı production ortamında kullanılamaz. "
                "Gerçek bir sağlayıcı seçin (POS_PROVIDER=iyzico|paytr)."
            )

    def start(self, payment, *, return_url: str, buyer: dict) -> CheckoutSession:
        self._guard()
        separator = "&" if "?" in return_url else "?"
        return CheckoutSession(
            mode="redirect",
            url=f"{return_url}{separator}oid={payment.merchant_oid}&sandbox=1",
            provider_reference=f"sandbox-{payment.merchant_oid}",
            raw={"provider": "sandbox"},
        )

    def handle_callback(self, payment, data: dict) -> CallbackResult:
        self._guard()
        success = str(data.get("status", "success")).lower() in ("success", "1", "true", "paid")
        return CallbackResult(
            success=success,
            message="" if success else "Sandbox ödeme başarısız olarak işaretlendi.",
            provider_reference=f"sandbox-{payment.merchant_oid}",
            raw={"provider": "sandbox", "status": data.get("status", "success")},
        )
