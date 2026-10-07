from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

# Geliştirmede e-postalar varsayılan olarak konsola yazılır. Gerçek Resend
# gönderimini denemek için .env'e RESEND_API_KEY koymak (ya da EMAIL_BACKEND'i
# elle vermek) yeterlidir — o zaman base.py'deki seçim geçerli kalır.
if not RESEND_API_KEY and not config("EMAIL_BACKEND", default=""):  # noqa: F405
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
