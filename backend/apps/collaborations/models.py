"""İş birliği (kabul edilen başvuru → içerik teslimi → onay → ödeme) modelleri.

İki ayrı durum makinesi vardır ve karıştırılmamalıdır:

* ``Application.status``: başvuru → kabul / red (apps/applications).
* ``Collaboration.status``: kabul edilen başvurunun *iş* yaşam döngüsü.

Her durum değişikliği ``StatusLog``'a yazılır (kim, ne zaman, eski → yeni).
"""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import attachment_extension_validator, validate_attachment_size


class CollaborationStatus(models.TextChoices):
    AWAITING_CONTENT = "awaiting_content", _("İçerik bekleniyor")
    DELIVERED = "delivered", _("Teslim edildi")
    REVISION = "revision", _("Revizyon")
    APPROVED = "approved", _("Onaylandı")
    PAID = "paid", _("Ödendi")
    CANCELLED = "cancelled", _("İptal")


class Collaboration(models.Model):
    application = models.OneToOneField(
        "applications.Application", on_delete=models.PROTECT, related_name="collaboration"
    )
    campaign = models.ForeignKey("campaigns.Campaign", on_delete=models.PROTECT, related_name="collaborations")
    brand = models.ForeignKey("brands.Brand", on_delete=models.PROTECT, related_name="collaborations")
    creator = models.ForeignKey("creators.Creator", on_delete=models.PROTECT, related_name="collaborations")

    status = models.CharField(
        max_length=20, choices=CollaborationStatus.choices, default=CollaborationStatus.AWAITING_CONTENT, db_index=True
    )
    #: Creator'a ödenecek anlaşılan tutar (komisyon HARİÇ; %10 komisyon markaya ayrıca eklenir).
    agreed_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )
    due_at = models.DateTimeField(null=True, blank=True)

    first_delivered_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    #: İlk teslim son tarihten önce mi yapıldı? Teslim edilene kadar ``None``.
    delivered_on_time = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "collaborations_collaboration"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"Collaboration<{self.pk}:{self.status}>"


class SubmissionStatus(models.TextChoices):
    SUBMITTED = "submitted", _("İnceleme bekliyor")
    APPROVED = "approved", _("Onaylandı")
    REVISION_REQUESTED = "revision_requested", _("Revizyon istendi")


class ContentSubmission(models.Model):
    """Creator'ın tek bir teslim denemesi (ilk teslim veya revizyon turu)."""

    collaboration = models.ForeignKey(Collaboration, on_delete=models.CASCADE, related_name="submissions")
    revision_number = models.PositiveIntegerField(default=0)
    file = models.FileField(
        upload_to="collab_submissions/%Y/%m/",
        blank=True,
        validators=[attachment_extension_validator, validate_attachment_size],
    )
    url = models.URLField(blank=True, help_text="Yayınlanmış içerik veya bulut bağlantısı.")
    note = models.TextField(blank=True)
    status = models.CharField(max_length=24, choices=SubmissionStatus.choices, default=SubmissionStatus.SUBMITTED)
    feedback = models.TextField(blank=True, help_text="Markanın revizyon notu.")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "collaborations_submission"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Submission<{self.collaboration_id}:r{self.revision_number}>"


class StatusLog(models.Model):
    """Kampanya / başvuru / iş birliği durum değişikliklerinin silinmeyen kaydı."""

    ENTITY_CAMPAIGN = "campaign"
    ENTITY_APPLICATION = "application"
    ENTITY_COLLABORATION = "collaboration"

    entity_type = models.CharField(max_length=20, db_index=True)
    entity_id = models.PositiveBigIntegerField(db_index=True)
    from_status = models.CharField(max_length=32, blank=True)
    to_status = models.CharField(max_length=32)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="status_changes"
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "collaborations_status_log"
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self):
        return f"{self.entity_type}#{self.entity_id}: {self.from_status or '—'} → {self.to_status}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("StatusLog kayıtları değiştirilemez.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("StatusLog kayıtları silinemez.")
