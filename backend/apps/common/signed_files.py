"""Yetki kontrollü, süreli imzalı dosya adresleri.

Mesaj ekleri ve içerik teslim dosyaları herkese açık ``/media/`` altından
**sunulmaz** (Caddy bu yolları engeller). Bunun yerine API, dosyayı isteyen
kullanıcıya özel, 10 dakika geçerli imzalı bir adres üretir; adres yalnızca o
dosya + o kullanıcı için geçerlidir ve süresi dolunca çalışmaz.
"""

from django.core import signing

SALT = "trugc.signed-file"
MAX_AGE_SECONDS = 600

KIND_MESSAGE_ATTACHMENT = "msg"
KIND_SUBMISSION = "sub"


def sign(kind: str, object_id: int, user_id: int) -> str:
    return signing.dumps({"k": kind, "i": object_id, "u": user_id}, salt=SALT)


def verify(token: str) -> dict:
    """Geçerliyse ``{"k","i","u"}`` döner; değilse ``signing.BadSignature``."""
    return signing.loads(token, salt=SALT, max_age=MAX_AGE_SECONDS)


def url_for(kind: str, object_id: int, user) -> str | None:
    if not getattr(user, "is_authenticated", False):
        return None
    return f"/api/v1/files/{sign(kind, object_id, user.pk)}/"
