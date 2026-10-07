"""Yanlış yapılandırmayı sessizce taşımamak için Django sistem kontrolleri.

``manage.py check`` ile (ve dolayısıyla her container başlangıcında, entrypoint
üzerinden) çalışır.
"""

from django.conf import settings
from django.core.checks import Warning as CheckWarning, register


# Resend gönderen alan adını doğrulamayı zorunlu tutar; bu sağlayıcıların
# alan adları doğrulanamaz, dolayısıyla "from" olarak kullanılamazlar.
UNVERIFIABLE_SENDER_DOMAINS = {
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "yahoo.com",
    "icloud.com",
}

CONSOLE_EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


@register()
def email_delivery_configured(app_configs, **kwargs):
    """E-posta doğrulaması zorunluyken gerçek bir gönderim yolu tanımlı olmalı.

    Birincil yol Resend'dir (``RESEND_API_KEY``); SMTP (``EMAIL_HOST``) yedek
    olarak durur. İkisi de yokken Django console backend'ine düşülür: doğrulama
    e-postası yalnızca container log'una yazılır, kullanıcıya ULAŞMAZ. O durumda
    yeni kayıt olan hiç kimse hesabını doğrulayamaz ve iş verme/iş alma
    özelliklerine erişemez — bu yüzden sessiz kalmak yerine açıkça uyarılır.
    """
    problems = []

    api_key = (getattr(settings, "RESEND_API_KEY", "") or "").strip()
    email_host = (getattr(settings, "EMAIL_HOST", "") or "").strip()
    backend = getattr(settings, "EMAIL_BACKEND", "")
    requires_email = getattr(settings, "ONBOARDING_REQUIRE_EMAIL_VERIFICATION", True)

    if requires_email and not api_key and not email_host:
        problems.append(
            CheckWarning(
                "E-posta doğrulaması zorunlu ama hiçbir gönderim sağlayıcısı yapılandırılmamış "
                "(RESEND_API_KEY ve EMAIL_HOST boş). Doğrulama e-postaları gönderilmeyecek ve "
                "yeni kullanıcılar hesaplarını doğrulayamayacak.",
                hint=(
                    "resend.com'da alan adını doğrulayıp RESEND_API_KEY'i doldurun "
                    "(DEFAULT_FROM_EMAIL o alan adında olmalı), ya da geçici olarak "
                    "ONBOARDING_REQUIRE_EMAIL_VERIFICATION=False yapın."
                ),
                id="accounts.W001",
            )
        )

    if api_key:
        sender = (getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
        domain = sender.rsplit("@", 1)[-1].rstrip(">").lower() if "@" in sender else ""
        if domain in UNVERIFIABLE_SENDER_DOMAINS:
            problems.append(
                CheckWarning(
                    f"DEFAULT_FROM_EMAIL ('{sender}') doğrulanamayan bir alan adı kullanıyor; "
                    "Resend bu adresten gönderimi 403 ile reddeder.",
                    hint="Kendi alan adınızı resend.com'da doğrulayın ve DEFAULT_FROM_EMAIL'i "
                    "o alan adındaki bir adrese alın (ör. noreply@trugc.com.tr).",
                    id="accounts.W002",
                )
            )

        if not api_key.startswith("re_"):
            problems.append(
                CheckWarning(
                    "RESEND_API_KEY beklenen biçimde değil ('re_' ile başlamıyor); "
                    "gönderimler 401 ile reddedilebilir.",
                    hint="Anahtarı resend.com → API Keys ekranından yeniden kopyalayın.",
                    id="accounts.W003",
                )
            )

        if backend == CONSOLE_EMAIL_BACKEND:
            problems.append(
                CheckWarning(
                    "RESEND_API_KEY dolu ama EMAIL_BACKEND console backend'inde: e-postalar "
                    "yalnızca log'a yazılıyor, Resend'e hiç gidilmiyor.",
                    hint="EMAIL_BACKEND ortam değişkenini kaldırın (otomatik olarak "
                    "apps.common.email.ResendEmailBackend seçilir) ya da DJANGO_SETTINGS_MODULE'ü "
                    "config.settings.prod yapın.",
                    id="accounts.W004",
                )
            )

    return problems


@register()
def pos_configuration_sane(app_configs, **kwargs):
    """Sanal POS ayarları tutarlı mı? (Eksik anahtar, production'da sandbox vb.)"""
    problems = []

    provider = (getattr(settings, "POS_PROVIDER", "") or "").strip().lower()
    if not provider:
        return problems

    from apps.payments.pos import PROVIDERS

    provider_class = PROVIDERS.get(provider)
    if provider_class is None:
        problems.append(
            CheckWarning(
                f"POS_PROVIDER='{provider}' tanınmıyor; ödeme başlatma uçları hata dönecek.",
                hint="Desteklenen değerler: " + ", ".join(sorted(PROVIDERS)),
                id="payments.W001",
            )
        )
        return problems

    missing = provider_class().missing_settings()
    if missing:
        problems.append(
            CheckWarning(
                f"POS sağlayıcısı '{provider}' seçili ama kimlik bilgileri eksik: " + ", ".join(missing),
                hint="Bu ortam değişkenlerini doldurun; aksi halde ödeme başlatma 503 döner.",
                id="payments.W002",
            )
        )

    if provider == "sandbox" and not settings.DEBUG and getattr(settings, "POS_SANDBOX_ALLOW_IN_PROD", False):
        problems.append(
            CheckWarning(
                "Sandbox POS sağlayıcısı production ortamında etkin: hiçbir gerçek tahsilat yapılmaz, "
                "her ödeme başarılı sayılır.",
                hint="Canlıya geçerken POS_PROVIDER'ı gerçek bir sağlayıcıya alın ve "
                "POS_SANDBOX_ALLOW_IN_PROD=False yapın.",
                id="payments.W003",
            )
        )

    return problems
