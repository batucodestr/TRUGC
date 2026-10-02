"""Test yardımcıları (yalnızca test kodunda kullanılır).

Zorunlu kullanıcı akışı (e-posta doğrulama + profil fotoğrafı) devreye
girdikten sonra, "iş verme/iş alma" uçlarına istek atan her test kullanıcısının
bu akışı tamamlamış olması gerekir. Her test dosyasında aynı hazırlığı
tekrarlamamak için tek yerde toplanmıştır.
"""

from __future__ import annotations

import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone


def png_bytes(width: int = 120, height: int = 120, color=(90, 60, 200)) -> bytes:
    """Doğrulayıcıların kabul edeceği gerçek (geçerli) bir PNG üretir.

    Profil fotoğrafı doğrulaması dosyayı Pillow ile açıp format ve minimum
    çözünürlük kontrolü yaptığı için, testlerde sahte/boş bir byte dizisi
    kullanılamaz.
    """
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buffer, format="PNG")
    return buffer.getvalue()


def avatar_upload(name: str = "avatar.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, png_bytes(), content_type="image/png")


def onboard(user):
    """Kullanıcıyı "akışı tamamlamış" hale getirir (e-posta doğrulanmış + fotoğraflı)."""
    user.email_verified = True
    user.email_verified_at = timezone.now()
    user.save(update_fields=["email_verified", "email_verified_at"])

    profile = user.profile
    profile.avatar.save("avatar.png", SimpleUploadedFile("avatar.png", png_bytes()), save=True)
    return user
