from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.validators import (
    attachment_extension_validator,
    image_extension_validator,
    validate_attachment_size,
    validate_image_size,
)


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        db_table = "creators_category"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Platform(models.TextChoices):
    INSTAGRAM = "instagram", _("Instagram")
    TIKTOK = "tiktok", _("TikTok")
    YOUTUBE = "youtube", _("YouTube")
    TWITTER_X = "twitter_x", _("X (Twitter)")
    TWITCH = "twitch", _("Twitch")
    FACEBOOK = "facebook", _("Facebook")
    LINKEDIN = "linkedin", _("LinkedIn")
    OTHER = "other", _("Other")


class Creator(models.Model):
    """role=creator olan bir kullanıcıya ait creator profili."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="creator")
    display_name = models.CharField(max_length=150, blank=True)
    bio = models.TextField(blank=True)
    cover = models.ImageField(
        upload_to="creator_covers/%Y/%m/",
        null=True,
        blank=True,
        validators=[image_extension_validator, validate_image_size],
    )
    categories = models.ManyToManyField(Category, blank=True, related_name="creators")

    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True, help_text="Whether the creator is open to new campaigns.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "creators_creator"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_verified", "is_available"])]

    def __str__(self):
        return self.display_name or self.user.email

    @property
    def total_followers(self):
        return sum(acc.followers_count for acc in self.social_accounts.all())

    @property
    def average_engagement_rate(self):
        accounts = list(self.social_accounts.all())
        if not accounts:
            return 0
        return round(sum(acc.engagement_rate for acc in accounts) / len(accounts), 2)


class SocialAccount(models.Model):
    """Platform bazında ölçeklenebilir istatistikler için ayrı takip edilen, bağlı tek bir platform hesabı."""

    creator = models.ForeignKey(Creator, on_delete=models.CASCADE, related_name="social_accounts")
    platform = models.CharField(max_length=20, choices=Platform.choices)
    handle = models.CharField(max_length=150)
    profile_url = models.URLField(blank=True)
    followers_count = models.PositiveIntegerField(default=0)
    engagement_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "creators_social_account"
        unique_together = ("creator", "platform", "handle")
        ordering = ["-followers_count"]

    def __str__(self):
        return f"{self.creator}:{self.platform}:{self.handle}"


class CreatorPackage(models.Model):
    """Bir creator'ın genel profilinde yayınladığı fiyatlandırma teklifi."""

    creator = models.ForeignKey(Creator, on_delete=models.CASCADE, related_name="packages")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    deliverables = models.JSONField(default=list, blank=True, help_text="List of deliverable strings.")
    turnaround_days = models.PositiveIntegerField(default=5)
    is_popular = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "creators_package"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.title} ({self.creator})"


class PortfolioItemKind(models.TextChoices):
    PORTFOLIO = "portfolio", _("Portfolio")
    MEDIA_KIT = "media_kit", _("Media Kit")


class PortfolioItem(models.Model):
    """Bir creator'ın profilinde sergilediği geçmiş bir çalışma örneği veya bir medya kiti belgesi."""

    creator = models.ForeignKey(Creator, on_delete=models.CASCADE, related_name="portfolio_items")
    kind = models.CharField(max_length=20, choices=PortfolioItemKind.choices, default=PortfolioItemKind.PORTFOLIO)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    media = models.FileField(
        upload_to="portfolio/%Y/%m/",
        null=True,
        blank=True,
        validators=[attachment_extension_validator, validate_attachment_size],
    )
    external_url = models.URLField(blank=True)
    platform = models.CharField(max_length=20, choices=Platform.choices, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "creators_portfolio_item"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
