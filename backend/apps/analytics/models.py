from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class EventType(models.TextChoices):
    PROFILE_VIEW = "profile_view", _("Profile view")
    CAMPAIGN_VIEW = "campaign_view", _("Campaign view")
    APPLICATION_SUBMITTED = "application_submitted", _("Application submitted")


class Event(models.Model):
    """Lightweight append-only event log powering future analytics/reporting."""

    event_type = models.CharField(max_length=32, choices=EventType.choices, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="events"
    )
    target_content_type = models.CharField(max_length=50, blank=True, help_text="e.g. 'campaign', 'creator'.")
    target_id = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "analytics_event"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["event_type", "target_content_type", "target_id"])]

    def __str__(self):
        return f"Event<{self.event_type}:{self.target_content_type}:{self.target_id}>"
