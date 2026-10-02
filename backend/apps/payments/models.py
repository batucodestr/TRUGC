import secrets
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
    currency = models.CharField(max_length=3, default="TRY")
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


# ---------------------------------------------------------------------------
# Sanal POS (bkz. apps/payments/pos/)
# ---------------------------------------------------------------------------
class PaymentPurpose(models.TextChoices):
    BRAND_ACCESS = "brand_access", _("Brand directory access")
    CAMPAIGN_ESCROW = "campaign_escrow", _("Campaign escrow funding")


class PosPaymentStatus(models.TextChoices):
    CREATED = "created", _("Created")
    PENDING = "pending", _("Pending at provider")
    PAID = "paid", _("Paid")
    FAILED = "failed", _("Failed")
    CANCELLED = "cancelled", _("Cancelled")


def generate_merchant_oid() -> str:
    """Bankaya gönderilen sipariş numarası.

    Sağlayıcıların çoğu (PayTR dahil) yalnızca harf+rakam kabul eder ve aynı
    numaranın tekrar kullanılmasını reddeder; bu yüzden her ödeme denemesi
    kendi rastgele numarasını alır. Tahmin edilemez olması ayrıca callback
    uçlarının dışarıdan sipariş numarası denenerek yoklanmasını zorlaştırır.
    """
    return f"TRUGC{secrets.token_hex(10).upper()}"


class PosPayment(models.Model):
    """Sanal POS üzerinden başlatılan tek bir ödeme denemesi.

    **Kart verisi burada tutulmaz ve hiçbir zaman bu sunucuya uğramaz**:
    entegrasyon, sağlayıcının kendi barındırdığı 3D Secure ödeme sayfasına
    yönlendirme (hosted checkout) modeliyle çalışır, dolayısıyla kart numarası
    / CVV uygulamaya hiç girmez. Burada yalnızca sipariş referansı, tutar,
    durum ve sağlayıcının kart dışı yanıt alanları saklanır.
    """

    merchant_oid = models.CharField(max_length=64, unique=True, default=generate_merchant_oid, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pos_payments")
    purpose = models.CharField(max_length=32, choices=PaymentPurpose.choices)

    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    currency = models.CharField(max_length=3, default="TRY")
    status = models.CharField(max_length=20, choices=PosPaymentStatus.choices, default=PosPaymentStatus.CREATED, db_index=True)

    provider = models.CharField(max_length=50)
    provider_reference = models.CharField(max_length=255, blank=True)

    # Marka erişim paketi satın alındığında kaç gün erişim açılacağı.
    access_days = models.PositiveIntegerField(default=0)
    # Kampanya emanetini fonlayan bir ödemeyse ilgili emanet kaydı.
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name="pos_payments"
    )

    client_ip = models.GenericIPAddressField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    # Sağlayıcının kart DIŞI yanıt alanları (işlem no, hata kodu, taksit bilgisi).
    provider_payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments_pos_payment"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "purpose"])]

    def __str__(self):
        return f"PosPayment<{self.merchant_oid}:{self.amount}{self.currency}:{self.status}>"

    @property
    def is_settled(self) -> bool:
        return self.status in (PosPaymentStatus.PAID, PosPaymentStatus.FAILED, PosPaymentStatus.CANCELLED)
