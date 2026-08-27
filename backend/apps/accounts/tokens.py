from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Şifre sıfırlamayla aynı HMAC şeması, farklı şekilde salt'lanmış ve
    ``email_verified`` değiştiği anda geçersiz kılınır; böylece kullanılmış/süresi
    dolmuş bir bağlantı tekrar oynatılamaz."""

    key_salt = "apps.accounts.tokens.EmailVerificationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()
