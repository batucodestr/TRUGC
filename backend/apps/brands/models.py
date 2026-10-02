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
    has_paid_access = models.BooleanField(
        default=False,
        help_text="Creator dizinini görüntüleme erişimi. Admin panelinden manuel olarak ya da sanal POS ödemesi tamamlandığında otomatik işaretlenir.",
    )
    paid_access_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text=(
            "Ücretli erişimin bitiş tarihi. Sanal POS ile satın alınan paketlerde doldurulur; "
            "BOŞ bırakılması süresiz erişim demektir (admin tarafından manuel açılan hesaplarla geriye dönük uyumluluk)."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "brands_brand"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["industry", "is_verified"])]

    def __str__(self):
        return self.company_name

    @property
    def paid_access_active(self) -> bool:
        """Ücretli creator dizini erişiminin şu an geçerli olup olmadığı.

        ``paid_access_until`` boşsa erişim süresizdir (admin tarafından manuel
        açılmış hesaplar); doluysa bitiş tarihi sunucu saatine göre kontrol
        edilir. Hafta sonu ücretsiz erişim bu alanı HİÇ değiştirmez — ücretsiz
        dönem kontrolü izin sınıfında ayrıca yapılır, böylece Pazartesi
        geldiğinde ödeme durumu olduğu gibi geri döner.
        """
        from django.utils import timezone

        if not self.has_paid_access:
            return False
        if self.paid_access_until is None:
            return True
        return self.paid_access_until > timezone.now()

    def grant_paid_access(self, days: int):
        """Sanal POS ödemesi onaylandığında erişimi açar/uzatır."""
        from datetime import timedelta

        from django.utils import timezone

        now = timezone.now()
        base = self.paid_access_until if (self.paid_access_until and self.paid_access_until > now) else now
        self.has_paid_access = True
        self.paid_access_until = base + timedelta(days=days)
        self.save(update_fields=["has_paid_access", "paid_access_until", "updated_at"])
        return self.paid_access_until
