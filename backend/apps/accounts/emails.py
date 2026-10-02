"""Hesap e-postaları (şifre sıfırlama + e-posta doğrulama).

Gönderim ``fail_silently=True`` ile yapılır: SMTP erişilemezse kayıt/şifre
sıfırlama isteği 500 ile çökmez, kullanıcı "yeniden gönder" ile tekrar
deneyebilir. ``EMAIL_HOST`` boşken Django'nun console backend'i devrededir ve
e-posta yalnızca container log'una yazılır — production'da gerçek SMTP
bilgileri (``EMAIL_*``) tanımlanmak ZORUNDADIR, aksi halde doğrulama
bağlantısı kullanıcıya hiç ulaşmaz.
"""

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token


def _uid(user):
    return urlsafe_base64_encode(force_bytes(user.pk))


def _verification_timeout_hours() -> int:
    seconds = int(getattr(settings, "EMAIL_VERIFICATION_TIMEOUT_SECONDS", 60 * 60 * 24))
    return max(1, seconds // 3600)


def send_password_reset_email(user):
    uid = _uid(user)
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="TRUGC şifrenizi sıfırlayın",
        message=(
            "Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:\n\n"
            f"{link}\n\n"
            "Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def build_verification_link(user) -> str:
    return f"{settings.FRONTEND_URL}/verify-email?uid={_uid(user)}&token={email_verification_token.make_token(user)}"


def send_verification_email(user):
    """Kayıt sonrası (ve "yeniden gönder" isteğinde) doğrulama bağlantısını yollar.

    Bağlantı ``EMAIL_VERIFICATION_TIMEOUT_SECONDS`` sonunda geçersiz olur ve
    doğrulama tamamlandığı an tek kullanımlık hale gelir (token imzası
    ``email_verified`` alanını içerir).
    """
    link = build_verification_link(user)
    hours = _verification_timeout_hours()
    text = (
        "TRUGC'ye hoş geldiniz!\n\n"
        "Hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulamanız gerekiyor. "
        "Aşağıdaki bağlantıya tıklayın:\n\n"
        f"{link}\n\n"
        f"Bu bağlantı {hours} saat boyunca geçerlidir.\n\n"
        "Doğrulama tamamlanmadan iş ilanı oluşturma ve işe başvurma özellikleri kullanılamaz.\n\n"
        "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz."
    )
    html = (
        "<p>TRUGC'ye hoş geldiniz!</p>"
        "<p>Hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulamanız gerekiyor.</p>"
        f'<p><a href="{link}">E-posta adresimi doğrula</a></p>'
        f"<p>Bağlantı çalışmazsa tarayıcınıza yapıştırın:<br><span>{link}</span></p>"
        f"<p>Bu bağlantı {hours} saat boyunca geçerlidir.</p>"
        "<p>Doğrulama tamamlanmadan iş ilanı oluşturma ve işe başvurma özellikleri kullanılamaz.</p>"
    )
    send_mail(
        subject="TRUGC e-posta adresinizi doğrulayın",
        message=text,
        html_message=html,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )
