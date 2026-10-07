"""
Tüm ortamlar tarafından paylaşılan temel ayarlar.
"""
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = config("DJANGO_DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ---------------------------------------------------------------------------
# Uygulamalar
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_extensions",
    "django_celery_beat",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.brands",
    "apps.creators",
    "apps.campaigns",
    "apps.applications",
    "apps.messaging",
    "apps.reviews",
    "apps.notifications",
    "apps.analytics",
    "apps.payments",
    "apps.reports",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.accounts.middleware.HideServerHeaderMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Veritabanı
# ---------------------------------------------------------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=config(
            "DATABASE_URL",
            default="postgres://trugc:trugc@localhost:5432/trugc",
        ),
        conn_max_age=600,
    )
}

# ---------------------------------------------------------------------------
# Şifre doğrulama
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Dil ve bölge ayarları
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Statik ve medya dosyaları
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
}

# MEDIA_URL göreli (/media/) olduğunda, DRF'nin ImageField'ı mutlak URL
# üretmek için request.build_absolute_uri() çağırır — bu da isteğin GERÇEKTE
# hangi Host üzerinden geldiğine bağlıdır. Frontend'in server-side fetch'leri
# Caddy'yi atlayıp Docker ağı üzerinden doğrudan backend:8000'e gittiğinden
# (bkz. lib/api.ts), bu durumda üretilen avatar/kapak URL'leri
# "http://backend:8000/media/..." olur — tarayıcının hiçbir zaman
# çözemeyeceği, yalnızca container'lar arası geçerli bir adres. DOMAIN
# tanımlıysa MEDIA_URL'i baştan mutlak (gerçek genel alan adı) yaparak bunu
# request'in geldiği yoldan tamamen bağımsız hale getiriyoruz — Django'nun
# build_absolute_uri()'si zaten mutlak bir URL'i olduğu gibi bırakır.
_public_domain = config("DOMAIN", default="")
MEDIA_URL = f"https://{_public_domain}/media/" if _public_domain else "/media/"
MEDIA_ROOT = BASE_DIR / "media"

USE_S3 = config("USE_S3", default=False, cast=bool)
if USE_S3:
    INSTALLED_APPS += ["storages"]
    STORAGES["default"]["BACKEND"] = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
    AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
    AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
    AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="")
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# DRF (Django REST Framework)
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "burst": "60/min",
    },
    "EXCEPTION_HANDLER": "apps.accounts.exceptions.custom_exception_handler",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=config("ACCESS_TOKEN_LIFETIME_MINUTES", default=30, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=config("REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "TRUGC API",
    "DESCRIPTION": "Influencer Marketplace platform connecting brands and creators.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/v1/",
}

# ---------------------------------------------------------------------------
# Önbellek / Redis
# ---------------------------------------------------------------------------
REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            # Redis geçici olarak erişilemez durumdaysa istekleri tamamen
            # reddetmek yerine (önbellek/throttling olmadan) zarif bir şekilde devam et.
            "IGNORE_EXCEPTIONS": True,
        },
    }
}
# Oturumlar önbellek yerine veritabanı üzerinden yönetilir; böylece Redis çökse
# bile Django admin girişi çalışmaya devam eder. JWT ile doğrulanan REST API
# zaten oturumlara hiç dokunmaz.
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# ---------------------------------------------------------------------------
# Channels (WebSocket ile gerçek zamanlı mesajlaşma) — önbellekle aynı Redis
# instance'ını kullanır, ancak farklı bir mantıksal rolde (ASGI consumer'lar
# arasında pub/sub grup mesajlaşması).
# ---------------------------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# ---------------------------------------------------------------------------
# Celery (arka plan görevleri)
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_BROKER_URL", default=REDIS_URL)
# Bir CPendingDeprecationWarning uyarısını susturur ve mevcut "başlangıçta
# yeniden dene" davranışını Celery 6+ için açıkça korur — bu sürümde varsayılan
# değer False'a dönecek; bu ayar olmadan worker, container başlangıcında henüz
# hazır olmayan broker'ı yeniden denemeyi bırakır (Redis'in healthcheck'iyle
# gerçek bir yarış durumu oluşur).
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

# ---------------------------------------------------------------------------
# CORS / CSRF
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="http://localhost:3000", cast=Csv())
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="http://localhost:3000", cast=Csv())

# E-postalara gömülen bağlantıları oluşturmak için kullanılan Next.js frontend'in temel URL'si.
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000").rstrip("/")

# ---------------------------------------------------------------------------
# Güvenlik (Caddy reverse proxy arkasında)
# ---------------------------------------------------------------------------
if config("SECURE_PROXY_SSL_HEADER", default=True, cast=bool):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = config("USE_X_FORWARDED_HOST", default=True, cast=bool)
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default=True, cast=bool)
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default=True, cast=bool)
SESSION_COOKIE_HTTPONLY = True

# Sunucu bilgisini gizle
SECURE_HSTS_SECONDS = config("SECURE_HSTS_SECONDS", default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0

# ---------------------------------------------------------------------------
# E-posta gönderimi
# ---------------------------------------------------------------------------
# Birincil sağlayıcı Resend'dir (HTTP API, 443 üzerinden — VPS'te kapalı olan
# giden SMTP portlarına ihtiyaç duymaz). Bkz. apps/common/email.py.
RESEND_API_KEY = config("RESEND_API_KEY", default="")
RESEND_API_URL = config("RESEND_API_URL", default="https://api.resend.com/emails")
RESEND_TIMEOUT_SECONDS = config("RESEND_TIMEOUT_SECONDS", default=8, cast=int)
# Geçici hatalarda (429/5xx/ağ) kaç kez daha denenecek. Kayıt isteği gönderimi
# senkron beklediği için düşük tutulur: en kötü durumda
# (RESEND_MAX_RETRIES + 1) * RESEND_TIMEOUT_SECONDS kadar beklenir.
RESEND_MAX_RETRIES = config("RESEND_MAX_RETRIES", default=1, cast=int)
# api.resend.com Cloudflare arkasında; stdlib'in varsayılan "Python-urllib/3.x"
# imzası bot sayılıp 403 (Error 1010) ile reddedilir. Boş bırakılamaz.
RESEND_USER_AGENT = config("RESEND_USER_AGENT", default="trugc-backend/1.0 (+https://trugc.com.tr)")

# SMTP yalnızca yedek yol olarak durur (Resend anahtarı yokken kullanılır).
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_TIMEOUT = config("EMAIL_TIMEOUT", default=10, cast=int)

# Gönderen adresi Resend'de doğrulanmış bir alan adına ait OLMALIDIR, aksi
# halde API 403 döner (bkz. apps/accounts/checks.py → accounts.W002).
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@trugc.com")
SERVER_EMAIL = config("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

# Backend seçimi: açıkça verilen EMAIL_BACKEND her şeyi ezer; yoksa Resend
# anahtarı → Resend, SMTP host → SMTP, ikisi de yoksa console (e-posta sadece
# container log'una yazılır, kullanıcıya ULAŞMAZ).
from apps.common.email import select_email_backend  # noqa: E402

EMAIL_BACKEND = select_email_backend(
    explicit=config("EMAIL_BACKEND", default=""),
    resend_api_key=RESEND_API_KEY,
    email_host=EMAIL_HOST,
)

# ---------------------------------------------------------------------------
# E-posta doğrulama
# ---------------------------------------------------------------------------
# Doğrulama bağlantısının geçerlilik süresi (saniye). Token'lar Django'nun HMAC
# şemasıyla üretilir (apps/accounts/tokens.py), durum bilgisizdir ve
# ``email_verified`` değiştiği an geçersizleşir — bu süre, kullanılmamış bir
# bağlantının ne kadar süre geçerli kalacağını belirler.
EMAIL_VERIFICATION_TIMEOUT_SECONDS = config("EMAIL_VERIFICATION_TIMEOUT_SECONDS", default=60 * 60 * 24, cast=int)

# Kayıt → e-posta doğrulama → profil fotoğrafı → uygulamayı kullanma akışının
# zorunlu olup olmadığı. Varsayılan olarak açıktır; yalnızca acil bir durumda
# (ör. SMTP tamamen devre dışıyken) geçici olarak kapatılmak üzere vardır.
ONBOARDING_REQUIRE_EMAIL_VERIFICATION = config("ONBOARDING_REQUIRE_EMAIL_VERIFICATION", default=True, cast=bool)
ONBOARDING_REQUIRE_PROFILE_PHOTO = config("ONBOARDING_REQUIRE_PROFILE_PHOTO", default=True, cast=bool)

# ---------------------------------------------------------------------------
# Ücretlendirme / hafta sonu ücretsiz kullanım (bkz. apps/common/pricing.py)
# ---------------------------------------------------------------------------
# Takvim gününün hangi saat diliminde değerlendirileceği. Django'nun TIME_ZONE'u
# UTC olduğu için bu ayrım şarttır: aksi halde Cumartesi 02:00 (TR) hâlâ Cuma
# sayılır ve kullanıcıdan ücret istenirdi.
BILLING_TIMEZONE = config("BILLING_TIMEZONE", default="Europe/Istanbul")
# Ücretsiz günler, Python'un weekday() indeksleriyle: Pazartesi=0 ... Pazar=6.
# Varsayılan "5,6" = Cumartesi + Pazar.
BILLING_FREE_WEEKDAYS = config("BILLING_FREE_WEEKDAYS", default="5,6", cast=Csv(int))
BILLING_FREE_PERIOD_ENABLED = config("BILLING_FREE_PERIOD_ENABLED", default=True, cast=bool)
BILLING_CURRENCY = config("BILLING_CURRENCY", default="TRY")
# Hafta içi uygulanan platform komisyonu (yüzde). Ücretsiz dönemde 0'a düşer.
PLATFORM_COMMISSION_PERCENT = config("PLATFORM_COMMISSION_PERCENT", default="10")
# Markanın creator dizinine erişim paketi: fiyat ve gün sayısı. Fiyat 0 ise
# sanal POS ile satın alma akışı kapalıdır (yalnızca admin manuel açar).
BRAND_ACCESS_PRICE = config("BRAND_ACCESS_PRICE", default="0")
BRAND_ACCESS_DAYS = config("BRAND_ACCESS_DAYS", default=30, cast=int)

# ---------------------------------------------------------------------------
# Sanal POS (bkz. apps/payments/pos/)
# ---------------------------------------------------------------------------
# "" (boş) = POS entegrasyonu yapılandırılmamış; ödeme başlatma endpoint'i
# 503 + POS_NOT_CONFIGURED döner (sessizce başarısız olmaz).
# "iyzico" | "paytr" | "sandbox" desteklenir.
POS_PROVIDER = config("POS_PROVIDER", default="")
# Ödeme sonrası kullanıcının geri döndürüleceği frontend sayfası.
POS_RETURN_URL = config("POS_RETURN_URL", default=f"{FRONTEND_URL}/payment/return")
POS_HTTP_TIMEOUT_SECONDS = config("POS_HTTP_TIMEOUT_SECONDS", default=20, cast=int)
# Sağlayıcıya özel kimlik bilgileri — ASLA koda yazılmaz, yalnızca ortam değişkeni.
IYZICO_API_KEY = config("IYZICO_API_KEY", default="")
IYZICO_SECRET_KEY = config("IYZICO_SECRET_KEY", default="")
IYZICO_BASE_URL = config("IYZICO_BASE_URL", default="https://sandbox-api.iyzipay.com")
PAYTR_MERCHANT_ID = config("PAYTR_MERCHANT_ID", default="")
PAYTR_MERCHANT_KEY = config("PAYTR_MERCHANT_KEY", default="")
PAYTR_MERCHANT_SALT = config("PAYTR_MERCHANT_SALT", default="")
PAYTR_TEST_MODE = config("PAYTR_TEST_MODE", default=True, cast=bool)
# Harici çağrı yapmayan sandbox sağlayıcısının production'da çalışmasına izin
# verir. Yalnızca canlı öncesi uçtan uca test için, bilinçli olarak açılır.
POS_SANDBOX_ALLOW_IN_PROD = config("POS_SANDBOX_ALLOW_IN_PROD", default=False, cast=bool)

# ---------------------------------------------------------------------------
# Loglama
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "[{asctime}] {levelname} {name}: {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
