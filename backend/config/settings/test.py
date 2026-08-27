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

# Throttling relies on a shared cache keyed by IP/scope; disable it for tests so
# unrelated test cases hitting the same "auth" scope don't 429 each other.
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_CLASSES": [], "DEFAULT_THROTTLE_RATES": {}}

CELERY_TASK_ALWAYS_EAGER = True
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
