from .base import *  # noqa: F401,F403

DEBUG = False

if not SECRET_KEY or SECRET_KEY == "insecure-dev-key-change-me":
    raise RuntimeError("DJANGO_SECRET_KEY must be set in production")

if not ALLOWED_HOSTS:
    raise RuntimeError("DJANGO_ALLOWED_HOSTS must be set in production")
