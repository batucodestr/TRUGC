from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ReportTargetType(models.TextChoices):
    CREATOR = "creator", _("Creator profile")
    BRAND = "brand", _("Brand profile")
    CAMPAIGN = "campaign", _("Campaign")
    MESSAGE = "message", _("Message")


class ReportStatus(models.TextChoices):
    OPEN = "open", _("Open")
    RESOLVED = "resolved", _("Resolved")
    DISMISSED = "dismissed", _("Dismissed")


class Report(models.Model):
    """Moderatör incelemesi için bir profil, kampanya veya mesaj hakkında kullanıcı tarafından gönderilen rapor.

    Bilinçli olarak minimal (MVP): hedef, bir GenericForeignKey yerine gevşek
    bir (type, id) çiftidir; çünkü tek tüketiciler bir moderatör liste görünümü
    ve bir çözümleme işlemidir — hiçbiri ilişkiyi ORM üzerinde gezmeye ihtiyaç
    duymaz, sadece gösterip bir insanın bakmasına izin verir.
    """

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_filed")
    target_type = models.CharField(max_length=20, choices=ReportTargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=ReportStatus.choices, default=ReportStatus.OPEN, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports_resolved",
    )
    resolution_notes = models.TextField(blank=True)

    class Meta:
        db_table = "reports_report"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "target_type"])]

    def __str__(self):
        return f"Report<{self.target_type}:{self.target_id}> by {self.reporter}"
