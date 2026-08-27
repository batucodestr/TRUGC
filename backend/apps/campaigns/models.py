from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import attachment_extension_validator, validate_attachment_size
from apps.creators.models import Category, Platform


class CampaignStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    PUBLISHED = "published", _("Published")
    IN_PROGRESS = "in_progress", _("In progress")
    COMPLETED = "completed", _("Completed")
    CANCELLED = "cancelled", _("Cancelled")


class Campaign(models.Model):
    """A brand's request for creator-generated content/promotion."""

    brand = models.ForeignKey(
        "brands.Brand", on_delete=models.CASCADE, related_name="campaigns"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    categories = models.ManyToManyField(Category, blank=True, related_name="campaigns")
    platform = models.CharField(max_length=20, choices=Platform.choices)

    budget_min = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    budget_max = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    requirements = models.TextField(blank=True, help_text="General content guidelines and brand restrictions.")
    start_date = models.DateTimeField(
        null=True, blank=True, help_text="When creator work is expected to begin (part of the campaign timeline)."
    )
    deadline = models.DateTimeField(help_text="Final deadline for deliverables (end of the campaign timeline).")

    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.DRAFT, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "campaigns_campaign"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "platform"]),
            models.Index(fields=["deadline"]),
        ]

    def __str__(self):
        return self.title

    @property
    def is_open(self):
        return self.status == CampaignStatus.PUBLISHED


class CampaignRequirement(models.Model):
    """A single structured deliverable expected from creators (e.g. '2 Instagram Reels')."""

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="deliverables")
    description = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=Platform.choices, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "campaigns_campaign_requirement"
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.quantity}x {self.description}"


class CampaignMedia(models.Model):
    """Reference/brief media attached to a campaign (mood boards, product shots, briefs)."""

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="media_files")
    file = models.FileField(
        upload_to="campaign_media/%Y/%m/",
        validators=[attachment_extension_validator, validate_attachment_size],
    )
    caption = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "campaigns_campaign_media"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Media<{self.campaign_id}:{self.file.name}>"
