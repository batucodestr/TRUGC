"""Sanal POS sağlayıcı soyutlaması.

Tasarım ilkeleri
----------------
* **Kart verisi asla bu sunucuya girmez.** Her sağlayıcı, kullanıcıyı kendi
  barındırdığı 3D Secure ödeme sayfasına yönlendirir (hosted checkout /
  iframe). Böylece PAN/CVV uygulamanın kapsamına hiç girmez ve PCI yükü
  sağlayıcıda kalır.
* **Kimlik bilgileri yalnızca ortam değişkenlerinden okunur** (settings
  üzerinden). Kodda hiçbir anahtar, salt veya URL sabiti yoktur.
* **Callback'e asla güvenilmez.** Her sağlayıcı, geri dönen bildirimi ya HMAC
  imzasıyla doğrular (PayTR) ya da sağlayıcıya sunucudan tekrar sorarak
  (iyzico) teyit eder. İstemciden gelen "ödeme başarılı" bilgisi tek başına
  hiçbir zaman erişim açmaz.
* Harici HTTP çağrıları stdlib ``urllib`` ile yapılır — imaja yeni bir Python
  bağımlılığı eklemez; her çağrı zaman aşımına tabidir.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)


class PosError(Exception):
    """Sağlayıcıyla konuşurken oluşan, kullanıcıya gösterilebilir hata."""

    code = "POS_ERROR"


class PosNotConfigured(PosError):
    """POS sağlayıcısı veya kimlik bilgileri tanımlı değil."""

    code = "POS_NOT_CONFIGURED"


@dataclass
class CheckoutSession:
    """Kullanıcının ödemeyi tamamlamak için gideceği yer.

    ``mode="redirect"`` → ``url``'e yönlendirilir.
    ``mode="html"``     → sağlayıcının ödeme formu/iframe HTML'i gömülür.
    """

    mode: str
    url: str = ""
    html: str = ""
    provider_reference: str = ""
    raw: dict = field(default_factory=dict)


@dataclass
class CallbackResult:
    """Sağlayıcı bildiriminin doğrulanmış sonucu."""

    success: bool
    message: str = ""
    provider_reference: str = ""
    raw: dict = field(default_factory=dict)
    # Sağlayıcıya geri yazılacak gövde (PayTR yalnızca düz "OK" bekler;
    # başka bir şey dönerse bildirimi tekrar tekrar gönderir).
    response_body: str = "OK"


def http_post(url: str, data: dict | str, *, headers: dict | None = None, timeout: int | None = None) -> tuple[int, str]:
    """Zaman aşımlı, yönlendirme izlemeyen basit POST. Gövdeyi (status, text) olarak döner."""
    if isinstance(data, dict):
        body = urllib.parse.urlencode(data).encode()
        default_content_type = "application/x-www-form-urlencoded"
    else:
        body = data.encode() if isinstance(data, str) else data
        default_content_type = "application/json"

    request_headers = {"Content-Type": default_content_type, "Accept": "application/json"}
    request_headers.update(headers or {})
    timeout = timeout or int(getattr(settings, "POS_HTTP_TIMEOUT_SECONDS", 20))

    request = urllib.request.Request(url, data=body, headers=request_headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - sabit, yapılandırılmış sağlayıcı URL'i
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        # Hata metni sağlayıcıya ait olabileceği ve kimlik bilgisi içermemesi
        # gerektiği için log'a yalnızca istisna tipi/mesajı yazılır.
        logger.warning("POS isteği başarısız: %s", exc)
        raise PosError("Ödeme sağlayıcısına ulaşılamadı. Lütfen birazdan tekrar deneyin.") from exc


def parse_json(text: str) -> dict:
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def amount_to_minor_units(amount: Decimal) -> int:
    """Kuruş cinsinden tam sayı (PayTR gibi sağlayıcıların beklediği biçim)."""
    return int((Decimal(amount) * 100).quantize(Decimal("1")))


class PosProvider(ABC):
    """Tüm sanal POS sağlayıcılarının uyguladığı arayüz."""

    name: str = ""
    #: Bu sağlayıcı için zorunlu ayar adları — eksikse POS_NOT_CONFIGURED döner.
    required_settings: tuple[str, ...] = ()

    def missing_settings(self) -> list[str]:
        return [key for key in self.required_settings if not getattr(settings, key, "")]

    def is_configured(self) -> bool:
        return not self.missing_settings()

    def ensure_configured(self):
        missing = self.missing_settings()
        if missing:
            raise PosNotConfigured(
                "Sanal POS entegrasyonu henüz yapılandırılmadı. Eksik ayarlar: " + ", ".join(missing)
            )

    @abstractmethod
    def start(self, payment, *, return_url: str, buyer: dict) -> CheckoutSession:
        """Sağlayıcıda ödeme oturumu açar ve kullanıcının gideceği yeri döner."""

    @abstractmethod
    def handle_callback(self, payment, data: dict) -> CallbackResult:
        """Sağlayıcının bildirimini doğrular ve sonucu döner."""

    def callback_lookup_key(self, data: dict) -> str:
        """Bildirim gövdesinden, ödemeyi bulmak için kullanılacak sipariş numarası."""
        return str(data.get("merchant_oid") or data.get("conversationId") or "").strip()
