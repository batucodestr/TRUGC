from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import image_extension_validator, validate_image_size


class Industry(models.TextChoices):
    FASHION = "fashion", _("Fashion")
    BEAUTY = "beauty", _("Beauty")
    FOOD_BEVERAGE = "food_beverage", _("Food & Beverage")
    TECH = "tech", _("Technology")
    FITNESS = "fitness", _("Fitness & Health")
    TRAVEL = "travel", _("Travel")
    GAMING = "gaming", _("Gaming")
    FINANCE = "finance", _("Finance")
    HOME_LIVING = "home_living", _("Home & Living")
    OTHER = "other", _("Other")


class CompanySize(models.TextChoices):
    SOLO = "solo", _("1 (Solo)")
    SMALL = "small", _("2-10")
    MEDIUM = "medium", _("11-50")
    LARGE = "large", _("51-200")
    ENTERPRISE = "enterprise", _("200+")


class Brand(models.Model):
    """role=brand olan bir kullanıcıya ait marka/şirket profili."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="brand")
    company_name = models.CharField(max_length=255, db_index=True)
    logo = models.ImageField(
        upload_to="brand_logos/%Y/%m/",
        null=True,
        blank=True,
        validators=[image_extension_validator, validate_image_size],
    )
    cover = models.ImageField(
        upload_to="brand_covers/%Y/%m/",
        null=True,
        blank=True,
        validators=[image_extension_validator, validate_image_size],
    )
    website = models.URLField(blank=True)
    industry = models.CharField(max_length=32, choices=Industry.choices, default=Industry.OTHER, db_index=True)
    company_size = models.CharField(max_length=16, choices=CompanySize.choices, blank=True)
    description = models.TextField(blank=True)
    headquarters = models.CharField(max_length=255, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)

    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "brands_brand"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["industry", "is_verified"])]

    def __str__(self):
        return self.company_name
