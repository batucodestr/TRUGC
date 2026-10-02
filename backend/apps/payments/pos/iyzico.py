"""iyzico sanal POS (Checkout Form / hosted 3D Secure) entegrasyonu.

Akış
----
1. ``/payment/iyzipos/checkoutform/initialize/auth/ecom`` çağrılır; iyzico bir
   ``token`` ve ``paymentPageUrl`` döner.
2. Kullanıcı o sayfada kart bilgisini girer (kart verisi bu sunucuya hiç
   uğramaz).
3. iyzico, ``callbackUrl``'e ``token`` ile POST eder. **Bu gövdeye güvenilmez**
   — token ile ``/payment/iyzipos/checkoutform/auth/ecom/detail`` servisine
   sunucudan tekrar sorulur ve ödeme durumu oradan teyit edilir.

Kimlik doğrulama şeması (IYZWSv2):
    signature = HMAC_SHA256(randomKey + uriPath + requestBody, secretKey)
    Authorization: IYZWSv2 base64("apiKey:<key>&randomKey:<rk>&signature:<sig>")

Kimlik bilgileri: ``IYZICO_API_KEY``, ``IYZICO_SECRET_KEY``, ``IYZICO_BASE_URL``
(sandbox: https://sandbox-api.iyzipay.com — canlı: https://api.iyzipay.com).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets

from django.conf import settings

from .base import CallbackResult, CheckoutSession, PosError, PosProvider, http_post, parse_json

INITIALIZE_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom"
DETAIL_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail"


class IyzicoProvider(PosProvider):
    name = "iyzico"
    required_settings = ("IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL")

    # -- yardımcılar ------------------------------------------------------
    def _auth_header(self, uri_path: str, body: str) -> dict:
        api_key = settings.IYZICO_API_KEY
        secret_key = settings.IYZICO_SECRET_KEY
        random_key = f"{secrets.token_hex(8)}"
        signature = hmac.new(
            secret_key.encode(), f"{random_key}{uri_path}{body}".encode(), hashlib.sha256
        ).hexdigest()
        authorization = base64.b64encode(
            f"apiKey:{api_key}&randomKey:{random_key}&signature:{signature}".encode()
        ).decode()
        return {
            "Authorization": f"IYZWSv2 {authorization}",
            "x-iyzi-rnd": random_key,
            "Content-Type": "application/json",
        }

    def _post(self, path: str, payload: dict) -> dict:
        body = json.dumps(payload, separators=(",", ":"))
        url = str(settings.IYZICO_BASE_URL).rstrip("/") + path
        status, text = http_post(url, body, headers=self._auth_header(path, body))
        data = parse_json(text)
        if status != 200 or not data:
            raise PosError("iyzico ödeme servisine erişilemedi.")
        return data

    # -- arayüz -----------------------------------------------------------
    def start(self, payment, *, return_url: str, buyer: dict) -> CheckoutSession:
        self.ensure_configured()

        price = f"{payment.amount:.2f}"
        name = (buyer.get("name") or buyer["email"].split("@")[0]).strip()
        first_name, _, last_name = name.partition(" ")
        payload = {
            "locale": "tr",
            "conversationId": payment.merchant_oid,
            "price": price,
            "paidPrice": price,
            "currency": payment.currency,
            "basketId": payment.merchant_oid,
            "paymentGroup": "PRODUCT",
            "callbackUrl": buyer["callback_url"],
            "enabledInstallments": [1],
            "buyer": {
                "id": str(payment.user_id),
                "name": first_name or "TRUGC",
                "surname": last_name or "Kullanici",
                "email": buyer["email"],
                "identityNumber": buyer.get("identity_number") or "11111111111",
                "registrationAddress": buyer.get("address") or "-",
                "city": buyer.get("city") or "Istanbul",
                "country": buyer.get("country") or "Turkey",
                "ip": payment.client_ip or "0.0.0.0",
            },
            "billingAddress": {
                "contactName": name or "TRUGC",
                "city": buyer.get("city") or "Istanbul",
                "country": buyer.get("country") or "Turkey",
                "address": buyer.get("address") or "-",
            },
            "basketItems": [
                {
                    "id": payment.purpose,
                    "name": buyer.get("product_name", "TRUGC"),
                    "category1": "Hizmet",
                    "itemType": "VIRTUAL",
                    "price": price,
                }
            ],
        }

        data = self._post(INITIALIZE_PATH, payload)
        if data.get("status") != "success":
            raise PosError(data.get("errorMessage") or "iyzico ödeme oturumu başlatılamadı.")

        page_url = data.get("paymentPageUrl")
        token = data.get("token", "")
        if page_url:
            return CheckoutSession(mode="redirect", url=page_url, provider_reference=token, raw={"status": "success"})
        # Bazı hesaplarda yalnızca gömülebilir form içeriği döner.
        return CheckoutSession(
            mode="html",
            html=data.get("checkoutFormContent", ""),
            provider_reference=token,
            raw={"status": "success"},
        )

    def handle_callback(self, payment, data: dict) -> CallbackResult:
        self.ensure_configured()

        token = str(data.get("token", "")).strip()
        if not token:
            raise PosError("iyzico bildiriminde token bulunamadı.")

        # Sonuç, istemciden gelen gövdeden DEĞİL, sağlayıcıya sunucudan
        # sorularak belirlenir — bildirim gövdesi taklit edilebilir.
        detail = self._post(DETAIL_PATH, {"locale": "tr", "conversationId": payment.merchant_oid, "token": token})

        if detail.get("status") != "success":
            return CallbackResult(
                success=False,
                message=str(detail.get("errorMessage") or "Ödeme doğrulanamadı.")[:255],
                raw={"status": detail.get("status"), "errorCode": detail.get("errorCode")},
                response_body="",
            )

        payment_status = str(detail.get("paymentStatus", ""))
        paid_price = detail.get("paidPrice")
        if paid_price is not None and abs(float(paid_price) - float(payment.amount)) > 0.01:
            return CallbackResult(
                success=False,
                message="Ödenen tutar ödeme kaydıyla uyuşmuyor.",
                raw={"paymentStatus": payment_status, "paidPrice": paid_price},
                response_body="",
            )

        success = payment_status == "SUCCESS"
        return CallbackResult(
            success=success,
            message="" if success else f"Ödeme durumu: {payment_status or 'bilinmiyor'}",
            provider_reference=str(detail.get("paymentId") or token),
            raw={
                "paymentStatus": payment_status,
                "paymentId": detail.get("paymentId"),
                "installment": detail.get("installment"),
                "fraudStatus": detail.get("fraudStatus"),
            },
            response_body="",
        )

    def callback_lookup_key(self, data: dict) -> str:
        return str(data.get("conversationId") or data.get("merchant_oid") or "").strip()
