"""PayTR sanal POS (iframe / hosted checkout) entegrasyonu.

Akış
----
1. Sunucu, ``get-token`` servisine HMAC-SHA256 ile imzalanmış bir istek atar ve
   bir ``token`` alır.
2. Kullanıcı ``https://www.paytr.com/odeme/guvenli/<token>`` adresine
   yönlendirilir; kart bilgileri yalnızca PayTR'de girilir (3D Secure dahil).
3. PayTR, sonucu **sunucudan sunucuya** bildirim (callback) olarak gönderir.
   Bildirimin imzası doğrulanır ve yanıt olarak düz ``OK`` yazılır — başka bir
   şey dönerse PayTR bildirimi tekrarlamaya devam eder.

Kimlik bilgileri: ``PAYTR_MERCHANT_ID``, ``PAYTR_MERCHANT_KEY``,
``PAYTR_MERCHANT_SALT`` (yalnızca ortam değişkeni).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json

from django.conf import settings

from .base import CallbackResult, CheckoutSession, PosError, PosProvider, amount_to_minor_units, http_post, parse_json

TOKEN_URL = "https://www.paytr.com/odeme/api/get-token"
PAYMENT_URL = "https://www.paytr.com/odeme/guvenli/{token}"


def _hmac_base64(message: str, key: str) -> str:
    return base64.b64encode(hmac.new(key.encode(), message.encode(), hashlib.sha256).digest()).decode()


class PayTRProvider(PosProvider):
    name = "paytr"
    required_settings = ("PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT")

    def start(self, payment, *, return_url: str, buyer: dict) -> CheckoutSession:
        self.ensure_configured()

        merchant_id = settings.PAYTR_MERCHANT_ID
        merchant_key = settings.PAYTR_MERCHANT_KEY
        merchant_salt = settings.PAYTR_MERCHANT_SALT
        test_mode = "1" if getattr(settings, "PAYTR_TEST_MODE", True) else "0"

        amount = amount_to_minor_units(payment.amount)
        user_ip = payment.client_ip or "0.0.0.0"
        # Sepet, PayTR'nin beklediği biçimde base64'lenmiş JSON: [[ad, fiyat, adet]]
        basket = base64.b64encode(
            json.dumps([[buyer.get("product_name", "TRUGC"), f"{payment.amount:.2f}", 1]]).encode()
        ).decode()
        no_installment = "1"
        max_installment = "0"
        currency = "TL" if payment.currency == "TRY" else payment.currency

        signature_payload = (
            f"{merchant_id}{user_ip}{payment.merchant_oid}{buyer['email']}{amount}"
            f"{basket}{no_installment}{max_installment}{currency}{test_mode}"
        )
        paytr_token = _hmac_base64(signature_payload + merchant_salt, merchant_key)

        status, text = http_post(
            TOKEN_URL,
            {
                "merchant_id": merchant_id,
                "user_ip": user_ip,
                "merchant_oid": payment.merchant_oid,
                "email": buyer["email"],
                "payment_amount": amount,
                "paytr_token": paytr_token,
                "user_basket": basket,
                "debug_on": "0",
                "no_installment": no_installment,
                "max_installment": max_installment,
                "user_name": buyer.get("name") or buyer["email"],
                "user_address": buyer.get("address") or "-",
                "user_phone": buyer.get("phone") or "-",
                "merchant_ok_url": return_url,
                "merchant_fail_url": return_url,
                "timeout_limit": "30",
                "currency": currency,
                "test_mode": test_mode,
            },
        )
        body = parse_json(text)
        if status != 200 or body.get("status") != "success":
            raise PosError(body.get("reason") or "PayTR ödeme oturumu başlatılamadı.")

        token = body["token"]
        return CheckoutSession(
            mode="redirect",
            url=PAYMENT_URL.format(token=token),
            provider_reference=token,
            raw={"status": body.get("status")},
        )

    def handle_callback(self, payment, data: dict) -> CallbackResult:
        """Bildirimin imzasını doğrular. İmza geçersizse sonuç ASLA kabul edilmez."""
        self.ensure_configured()

        merchant_key = settings.PAYTR_MERCHANT_KEY
        merchant_salt = settings.PAYTR_MERCHANT_SALT

        merchant_oid = str(data.get("merchant_oid", ""))
        status_field = str(data.get("status", ""))
        total_amount = str(data.get("total_amount", ""))
        received_hash = str(data.get("hash", ""))

        expected_hash = _hmac_base64(
            f"{merchant_oid}{merchant_salt}{status_field}{total_amount}", merchant_key
        )
        if not hmac.compare_digest(expected_hash, received_hash):
            raise PosError("Geçersiz PayTR bildirim imzası.")

        # Tutarın da beklenenle aynı olduğu doğrulanır: imza geçerli olsa bile
        # farklı bir tutarla gelen bir bildirim erişim açmamalıdır.
        if total_amount and amount_to_minor_units(payment.amount) != int(float(total_amount)):
            return CallbackResult(
                success=False,
                message="Bildirilen tutar ödeme kaydıyla uyuşmuyor.",
                raw={"status": status_field, "total_amount": total_amount},
            )

        success = status_field == "success"
        return CallbackResult(
            success=success,
            message="" if success else str(data.get("failed_reason_msg", "Ödeme başarısız."))[:255],
            provider_reference=str(data.get("payment_id", "") or payment.provider_reference),
            raw={
                "status": status_field,
                "payment_type": data.get("payment_type"),
                "installment_count": data.get("installment_count"),
                "failed_reason_code": data.get("failed_reason_code"),
            },
            response_body="OK",
        )
