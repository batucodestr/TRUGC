"""Yanlış yapılandırmayı sessizce taşımamak için Django sistem kontrolleri.

``manage.py check`` ile (ve dolayısıyla her container başlangıcında, entrypoint
üzerinden) çalışır.
"""

from django.conf import settings
from django.core.checks import Warning as CheckWarning, register


@register()
def email_delivery_configured(app_configs, **kwargs):
    """E-posta doğrulaması zorunluyken gerçek bir SMTP sunucusu tanımlı olmalı.

    ``EMAIL_HOST`` boşken Django console backend'ine düşer: doğrulama e-postası
    yalnızca container log'una yazılır, kullanıcıya ULAŞMAZ. Bu durumda yeni
    kayıt olan hiç kimse hesabını doğrulayamaz ve iş verme/iş alma özelliklerine
    erişemez — bu yüzden sessiz kalmak yerine açıkça uyarılır.
    """
    problems = []

    requires_email = getattr(settings, "ONBOARDING_REQUIRE_EMAIL_VERIFICATION", True)
    if requires_email and not getattr(settings, "EMAIL_HOST", ""):
        problems.append(
            CheckWarning(
                "E-posta doğrulaması zorunlu ama SMTP yapılandırılmamış (EMAIL_HOST boş). "
                "Doğrulama e-postaları gönderilmeyecek ve yeni kullanıcılar hesaplarını "
                "doğrulayamayacak.",
                hint=(
                    "EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD "
                    "ortam değişkenlerini doldurun (Gmail için 2FA + uygulama şifresi), "
                    "ya da geçici olarak ONBOARDING_REQUIRE_EMAIL_VERIFICATION=False yapın."
                ),
                id="accounts.W001",
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
