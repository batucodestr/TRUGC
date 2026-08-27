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
    """A user-submitted report against a profile, campaign, or message, for moderator review.

    Deliberately minimal (MVP): the target is a loose (type, id) pair rather
    than a GenericForeignKey, since the only consumers are a moderator list
    view and a resolve action — neither needs to traverse the relation in the
    ORM, just display it and let a human go look.
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
