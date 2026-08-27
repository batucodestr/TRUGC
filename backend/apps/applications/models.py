from django.db import models
from django.utils.translation import gettext_lazy as _


class ApplicationStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    ACCEPTED = "accepted", _("Accepted")
    REJECTED = "rejected", _("Rejected")
    WITHDRAWN = "withdrawn", _("Withdrawn")


class Application(models.Model):
    """Bir creator'ın bir markanın kampanyasına yaptığı başvuru."""

    creator = models.ForeignKey("creators.Creator", on_delete=models.CASCADE, related_name="applications")
    campaign = models.ForeignKey("campaigns.Campaign", on_delete=models.CASCADE, related_name="applications")
    message = models.TextField(help_text="Pitch/message from the creator to the brand.")
    proposed_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=ApplicationStatus.choices, default=ApplicationStatus.PENDING, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "applications_application"
        ordering = ["-created_at"]
        unique_together = ("creator", "campaign")
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"Application<{self.creator_id}->{self.campaign_id}:{self.status}>"
