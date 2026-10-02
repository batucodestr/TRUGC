"""Uygulamalar arasında paylaşılan FileField/ImageField yükleme doğrulayıcıları.

Bağımlılıksız tutulur (python-magic yok) — dosya uzantısına ve Django'nun
kendi ImageField/Pillow kontrolüne göre doğrulama yapar; bu, marketplace'in
tehdit modeli (kendi medyasını yükleyen kimliği doğrulanmış kullanıcılar) için
Docker imajına yerel bir bağımlılık eklemeden yeterlidir.
"""

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"]
DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"]
ATTACHMENT_EXTENSIONS = IMAGE_EXTENSIONS + ["pdf", "mp4", "mov", "zip", "doc", "docx", "ppt", "pptx"]
# Mesaj ekleri, ürün spesifikasyonu gereği genel kampanya medyası/portföy
# eklerinden (yalnızca görsel + PDF) bilinçli olarak daha sıkı kapsamlıdır.
MESSAGE_ATTACHMENT_EXTENSIONS = IMAGE_EXTENSIONS + ["pdf"]

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024
MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
MAX_MESSAGE_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024


def _validate_max_size(value, max_bytes):
    if value.size > max_bytes:
        raise ValidationError(f"File too large ({value.size / 1024 / 1024:.1f}MB). Max is {max_bytes / 1024 / 1024:.0f}MB.")


def validate_image_size(value):
    _validate_max_size(value, MAX_IMAGE_SIZE_BYTES)


def validate_document_size(value):
    _validate_max_size(value, MAX_DOCUMENT_SIZE_BYTES)


def validate_attachment_size(value):
    _validate_max_size(value, MAX_ATTACHMENT_SIZE_BYTES)


def validate_message_attachment_size(value):
    _validate_max_size(value, MAX_MESSAGE_ATTACHMENT_SIZE_BYTES)


image_extension_validator = FileExtensionValidator(allowed_extensions=IMAGE_EXTENSIONS)
document_extension_validator = FileExtensionValidator(allowed_extensions=DOCUMENT_EXTENSIONS)
attachment_extension_validator = FileExtensionValidator(allowed_extensions=ATTACHMENT_EXTENSIONS)
message_attachment_extension_validator = FileExtensionValidator(allowed_extensions=MESSAGE_ATTACHMENT_EXTENSIONS)


# ---------------------------------------------------------------------------
# Profil fotoğrafı (zorunlu, kullanıcı başına tek adet)
# ---------------------------------------------------------------------------
# Profil fotoğrafı, genel profillerde ve mesajlaşmada görünen tek görsel
# olduğu için diğer yüklemelerden daha sıkı doğrulanır: animasyonlu/çok
# katmanlı GIF kabul edilmez, dosyanın gerçekten bir görsel olduğu Pillow ile
# doğrulanır ve "decompression bomb" niteliğindeki aşırı büyük çözünürlükler
# reddedilir.
AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
AVATAR_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
MIN_AVATAR_DIMENSION = 100
MAX_AVATAR_DIMENSION = 6000

avatar_extension_validator = FileExtensionValidator(allowed_extensions=AVATAR_EXTENSIONS)


def validate_avatar_size(value):
    _validate_max_size(value, MAX_AVATAR_SIZE_BYTES)


def validate_avatar_image(value):
    """Yüklenen dosyanın gerçekten makul boyutlarda bir görsel olduğunu doğrular.

    Uzantı ve MIME tipi istemci tarafından belirlenir, dolayısıyla tek başına
    güvenilmez; burada dosya içeriği Pillow ile açılıp format ve çözünürlük
    kontrol edilir. ``ImageField`` zaten Pillow ile bir ön doğrulama yapar,
    ancak formatı kısıtlamaz ve çözünürlük sınırı koymaz.
    """
    from PIL import Image, UnidentifiedImageError

    file = getattr(value, "file", value)
    try:
        position = file.tell()
    except (AttributeError, OSError):
        position = None

    try:
        file.seek(0)
        with Image.open(file) as image:
            image_format = (image.format or "").upper()
            width, height = image.size
            # verify(), dosyanın tamamını decode etmeden bozuk/sahte görselleri
            # yakalar; çağrıldıktan sonra image nesnesi tekrar kullanılamaz,
            # bu yüzden format/boyut bilgisi önce okunur.
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise ValidationError("Geçersiz veya bozuk görsel dosyası. JPG, PNG veya WEBP yükleyin.")
    finally:
        try:
            file.seek(position if position is not None else 0)
        except (AttributeError, OSError):
            pass

    if image_format not in AVATAR_FORMATS:
        raise ValidationError("Desteklenmeyen görsel formatı. JPG, PNG veya WEBP yükleyin.")
    if width < MIN_AVATAR_DIMENSION or height < MIN_AVATAR_DIMENSION:
        raise ValidationError(
            f"Görsel çok küçük ({width}x{height}px). En az {MIN_AVATAR_DIMENSION}x{MIN_AVATAR_DIMENSION}px olmalı."
        )
    if width > MAX_AVATAR_DIMENSION or height > MAX_AVATAR_DIMENSION:
        raise ValidationError(
            f"Görsel çözünürlüğü çok yüksek ({width}x{height}px). En fazla {MAX_AVATAR_DIMENSION}px olabilir."
        )
