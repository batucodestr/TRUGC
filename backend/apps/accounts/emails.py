from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_verification_token


def _uid(user):
    return urlsafe_base64_encode(force_bytes(user.pk))


def send_password_reset_email(user):
    uid = _uid(user)
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
    send_mail(
        subject="Reset your TRUGC password",
        message=f"Use the link below to reset your password:\n\n{link}\n\nIf you did not request this, ignore this email.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_verification_email(user):
    uid = _uid(user)
    token = email_verification_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/verify-email?uid={uid}&token={token}"
    send_mail(
        subject="Verify your TRUGC email address",
        message=f"Confirm your email address by visiting:\n\n{link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )
