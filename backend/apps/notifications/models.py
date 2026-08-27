from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    APPLICATION = "application", _("Application")
    MESSAGE = "message", _("Message")
    CAMPAIGN = "campaign", _("Campaign")
    REVIEW = "review", _("Review")
    PAYMENT = "payment", _("Payment")
    SYSTEM = "system", _("System")


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=500, blank=True, help_text="Frontend deep-link path.")

    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self):
        return f"Notification<{self.user_id}:{self.title}>"
