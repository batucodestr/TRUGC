"""OAuth token şifreleme (Fernet). Düz metin token veritabanına yazılmaz."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet() -> Fernet:
    key = getattr(settings, "SOCIAL_TOKEN_ENCRYPTION_KEY", "") or ""
    if key:
        return Fernet(key.encode())
    # Ayrı anahtar verilmemişse SECRET_KEY'den türetilir (SECRET_KEY değişirse token'lar çözülemez → yeniden bağlama gerekir).
    digest = hashlib.sha256(("trugc-social:" + settings.SECRET_KEY).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode() if value else ""


def decrypt(value: str) -> str:
    if not value:
        return ""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        return ""
