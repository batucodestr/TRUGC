"""Shared upload validators for FileField/ImageField across apps.

Kept dependency-free (no python-magic) — validates by file extension and
Django's own ImageField/Pillow check, which is sufficient for the marketplace's
threat model (authenticated users uploading their own media) without adding
a native dependency to the Docker image.
"""

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"]
DOCUMENT_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"]
ATTACHMENT_EXTENSIONS = IMAGE_EXTENSIONS + ["pdf", "mp4", "mov", "zip", "doc", "docx", "ppt", "pptx"]
# Message attachments are intentionally scoped tighter than general campaign
# media/portfolio attachments (image + PDF only) per product spec.
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
