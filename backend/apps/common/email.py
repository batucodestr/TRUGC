"""Resend (https://resend.com) HTTP API'si üzerinden gönderim yapan Django e-posta backend'i.

Neden SMTP yerine HTTP: pek çok VPS sağlayıcısı 25/465/587 numaralı giden
portları kapatır ve Caddy arkasındaki bu kurulumda SMTP bağlantısı sessizce
zaman aşımına düşer. Resend'in REST uçları 443 üzerinden çalıştığı için ek bir
ağ izni gerektirmez.

Yeni bir bağımlılık (``requests`` / ``resend`` SDK) eklemeyip stdlib
``urllib.request`` kullanılır: tek bir POST isteği için yeterli ve imajın
yeniden kurulmasını gerektirmez.

``django.core.mail`` arayüzünün tamamını destekler, yani mevcut ``send_mail``
çağrıları değişmeden çalışır: düz metin + HTML (``html_message`` /
``EmailMultiAlternatives``), cc, bcc, reply-to, ek dosyalar ve ekstra başlıklar.

Gönderim hataları ``fail_silently`` ile yutulsa bile ERROR seviyesinde loglanır:
kayıt akışı ``fail_silently=True`` ile çağırdığı için tek görünür iz log'dur.
"""

from __future__ import annotations

import base64
import json
import logging
import time
import urllib.error
import urllib.request
from email.mime.base import MIMEBase

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://api.resend.com/emails"

# api.resend.com Cloudflare arkasındadır ve stdlib'in varsayılan
# "Python-urllib/3.x" imzasını bot sayıp Error 1010 (browser_signature_banned)
# ile 403 döner — bu yüzden kendi User-Agent'ımızı göndermek ZORUNLUDUR.
DEFAULT_USER_AGENT = "trugc-backend/1.0 (+https://trugc.com.tr)"

# Resend'in kendi üretip yöneteceği başlıklar; ``extra_headers`` ile tekrar
# gönderilirse çakışır, bu yüzden ayıklanır.
_RESERVED_HEADERS = {"from", "to", "cc", "bcc", "subject", "reply-to"}

# Geçici sayılan ve tekrar denenen HTTP kodları (429 = rate limit).
_RETRYABLE_STATUSES = {408, 409, 429, 500, 502, 503, 504}


SMTP_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
CONSOLE_BACKEND = "django.core.mail.backends.console.EmailBackend"
RESEND_BACKEND = "apps.common.email.ResendEmailBackend"


def select_email_backend(explicit: str = "", resend_api_key: str = "", email_host: str = "") -> str:
    """Hangi ``EMAIL_BACKEND``in kullanılacağına karar verir (``base.py`` çağırır).

    Sıra: açıkça verilen değer > Resend anahtarı > SMTP host > console. Console'a
    düşmek "e-posta gönderilmiyor" anlamına gelir; bunu ``manage.py check``
    (accounts.W001) ayrıca duyurur.
    """
    if explicit.strip():
        return explicit.strip()
    if resend_api_key.strip():
        return RESEND_BACKEND
    if email_host.strip():
        return SMTP_BACKEND
    return CONSOLE_BACKEND


class ResendError(Exception):
    """Resend API'si 2xx dışında yanıt verdi ya da hiç ulaşılamadı."""


class ResendEmailBackend(BaseEmailBackend):
    """``EMAIL_BACKEND`` olarak kullanılan Resend istemcisi.

    Ayarlar (hepsi ``settings`` üzerinden, bkz. ``config/settings/base.py``):
    ``RESEND_API_KEY``, ``RESEND_API_URL``, ``RESEND_TIMEOUT_SECONDS``,
    ``RESEND_MAX_RETRIES``.
    """

    def __init__(
        self,
        fail_silently=False,
        api_key=None,
        api_url=None,
        timeout=None,
        max_retries=None,
        user_agent=None,
        **kwargs,
    ):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = (api_key if api_key is not None else getattr(settings, "RESEND_API_KEY", "")) or ""
        self.api_url = (api_url or getattr(settings, "RESEND_API_URL", "") or DEFAULT_API_URL).rstrip("/")
        self.timeout = timeout if timeout is not None else getattr(settings, "RESEND_TIMEOUT_SECONDS", 8)
        self.max_retries = max_retries if max_retries is not None else getattr(settings, "RESEND_MAX_RETRIES", 1)
        self.user_agent = user_agent or getattr(settings, "RESEND_USER_AGENT", "") or DEFAULT_USER_AGENT

    # -- django.core.mail arayüzü ------------------------------------------
    def send_messages(self, email_messages):
        """Gönderilen mesaj sayısını döndürür (Django sözleşmesi)."""
        if not email_messages:
            return 0

        if not self.api_key:
            logger.error(
                "RESEND_API_KEY tanımlı değil: %d e-posta gönderilmedi (alıcılar: %s).",
                len(email_messages),
                ", ".join(", ".join(m.recipients()) for m in email_messages) or "-",
            )
            if not self.fail_silently:
                raise ResendError("RESEND_API_KEY tanımlı değil")
            return 0

        sent = 0
        for message in email_messages:
            try:
                if self._send(message):
                    sent += 1
            except Exception:
                logger.exception(
                    "Resend gönderimi başarısız (konu=%r, alıcı=%s).", message.subject, ", ".join(message.recipients())
                )
                if not self.fail_silently:
                    raise
        return sent

    # -- iç kısım ----------------------------------------------------------
    def _send(self, message) -> bool:
        if not message.recipients():
            return False
        response = self._post(self.build_payload(message))
        logger.info(
            "Resend e-posta kabul edildi (id=%s, konu=%r, alıcı=%s).",
            (response or {}).get("id", "?"),
            message.subject,
            ", ".join(message.recipients()),
        )
        return True

    def build_payload(self, message) -> dict:
        """Bir ``EmailMessage``'ı Resend'in ``POST /emails`` gövdesine çevirir."""
        text, html = _bodies(message)
        payload = {
            "from": message.from_email or settings.DEFAULT_FROM_EMAIL,
            "to": list(message.to),
            "subject": message.subject or "",
        }
        # Resend ``html`` ya da ``text``ten en az birini zorunlu tutar.
        if html is not None:
            payload["html"] = html
        if text is not None or html is None:
            payload["text"] = text or ""

        if message.cc:
            payload["cc"] = list(message.cc)
        if message.bcc:
            payload["bcc"] = list(message.bcc)
        if message.reply_to:
            payload["reply_to"] = list(message.reply_to)

        headers = {k: v for k, v in (message.extra_headers or {}).items() if k.lower() not in _RESERVED_HEADERS}
        if headers:
            payload["headers"] = headers

        attachments = [_attachment(item) for item in (message.attachments or [])]
        if attachments:
            payload["attachments"] = attachments

        return payload

    def _post(self, payload: dict) -> dict:
        body = json.dumps(payload).encode()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Olmazsa Cloudflare 403/1010 döner (bkz. DEFAULT_USER_AGENT).
            "User-Agent": self.user_agent,
        }
        attempts = max(1, self.max_retries + 1)
        for attempt in range(1, attempts + 1):
            request = urllib.request.Request(self.api_url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    raw = response.read().decode("utf-8", errors="replace")
                try:
                    return json.loads(raw) if raw.strip() else {}
                except ValueError:
                    # 2xx geldiyse gönderim kabul edilmiştir; gövde okunamasa da
                    # bunu hata saymıyoruz.
                    return {}
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:500]
                retryable = exc.code in _RETRYABLE_STATUSES
                error = ResendError(f"Resend HTTP {exc.code}: {detail}")
            except urllib.error.URLError as exc:
                retryable = True
                error = ResendError(f"Resend'e ulaşılamadı: {exc.reason}")
            except TimeoutError as exc:
                retryable = True
                error = ResendError(f"Resend isteği {self.timeout}s içinde yanıtlanmadı: {exc}")

            if not retryable or attempt == attempts:
                raise error
            logger.warning("Resend denemesi %d/%d başarısız, tekrar deneniyor: %s", attempt, attempts, error)
            time.sleep(0.5 * attempt)

        raise ResendError("Resend gönderimi beklenmedik biçimde sonlandı")  # pragma: no cover


def _bodies(message) -> tuple[str | None, str | None]:
    """(düz metin, html) ikilisini çıkarır; biri yoksa ``None`` döner."""
    text = html = None
    if getattr(message, "content_subtype", "plain") == "html":
        html = message.body or ""
    else:
        text = message.body or ""
    for content, mimetype in getattr(message, "alternatives", None) or []:
        if mimetype == "text/html" and html is None:
            html = content
    return text, html


def _attachment(item) -> dict:
    """Django ekini Resend'in beklediği ``{filename, content(base64)}`` biçimine çevirir."""
    if isinstance(item, MIMEBase):
        filename = item.get_filename() or "attachment"
        content = item.get_payload(decode=True) or b""
    else:
        filename, content, _mimetype = item
    if isinstance(content, str):
        content = content.encode("utf-8")
    return {"filename": filename or "attachment", "content": base64.b64encode(content).decode("ascii")}
