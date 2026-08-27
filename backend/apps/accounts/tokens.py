from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Same HMAC scheme as password reset, salted differently and invalidated
    once ``email_verified`` flips, so a used/expired link cannot be replayed."""

    key_salt = "apps.accounts.tokens.EmailVerificationTokenGenerator"

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()
