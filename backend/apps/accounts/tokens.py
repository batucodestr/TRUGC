from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.crypto import constant_time_compare
from django.utils.http import base36_to_int


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Şifre sıfırlamayla aynı HMAC şeması, farklı şekilde salt'lanmış ve
    ``email_verified`` değiştiği anda geçersiz kılınır; böylece kullanılmış/süresi
    dolmuş bir bağlantı tekrar oynatılamaz.

    Durum bilgisi tutmaz (veritabanında token saklanmaz) — imza, kullanıcının
    birincil anahtarı, e-postası, mevcut doğrulama durumu ve ``SECRET_KEY``
    üzerinden türetilir. Geçerlilik süresi, şifre sıfırlamadan **bağımsız**
    olarak ``EMAIL_VERIFICATION_TIMEOUT_SECONDS`` ile yönetilir (varsayılan 24
    saat); Django'nun kendi ``check_token``'ı global ``PASSWORD_RESET_TIMEOUT``
    değerini kullandığı için zaman kontrolü burada yeniden uygulanır.
    """

    key_salt = "apps.accounts.tokens.EmailVerificationTokenGenerator"

    @property
    def timeout(self) -> int:
        return int(getattr(settings, "EMAIL_VERIFICATION_TIMEOUT_SECONDS", 60 * 60 * 24))

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"

    def check_token(self, user, token):
        """Django 5'in uygulamasıyla aynı; tek fark zaman aşımı kaynağıdır."""
        if not (user and token):
            return False
        try:
            ts_b36, _ = token.split("-")
        except ValueError:
            return False
        try:
            ts = base36_to_int(ts_b36)
        except ValueError:
            return False

        for secret in [self.secret, *self.secret_fallbacks]:
            if constant_time_compare(self._make_token_with_timestamp(user, ts, secret), token):
                break
        else:
            return False

        return (self._num_seconds(self._now()) - ts) <= self.timeout


email_verification_token = EmailVerificationTokenGenerator()
