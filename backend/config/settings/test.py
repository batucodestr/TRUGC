from .base import *  # noqa: F401,F403

DEBUG = False
SECRET_KEY = "test-secret-key"
ALLOWED_HOSTS = ["*"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Throttling, IP/scope ile anahtarlanan paylaşımlı bir önbelleğe dayanır; testler
# için devre dışı bırakıyoruz ki aynı "auth" scope'una düşen ilgisiz test case'leri
# birbirini 429'a düşürmesin.
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": [], "DEFAULT_THROTTLE_RATES": {}}

CELERY_TASK_ALWAYS_EAGER = True
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
