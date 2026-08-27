from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class TransactionStatus(models.TextChoices):
    PENDING = "pending", _("Pending")
    HELD_IN_ESCROW = "held_in_escrow", _("Held in escrow")
    RELEASED = "released", _("Released")
    REFUNDED = "refunded", _("Refunded")
    FAILED = "failed", _("Failed")


class Transaction(models.Model):
    """
    A payment moving from a brand to a creator for an accepted application.
    Provider-agnostic by design (provider/provider_reference) so a real gateway
    (Stripe Connect, etc.) can be plugged in later without a schema change.
    """

    application = models.ForeignKey(
        "applications.Application", on_delete=models.PROTECT, related_name="transactions"
    )
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments_made")
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments_received")

    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(max_length=20, choices=TransactionStatus.choices, default=TransactionStatus.PENDING, db_index=True)

    provider = models.CharField(max_length=50, blank=True, help_text="e.g. 'stripe'. Empty while unintegrated.")
    provider_reference = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments_transaction"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self):
        return f"Transaction<{self.pk}:{self.amount}{self.currency}:{self.status}>"
